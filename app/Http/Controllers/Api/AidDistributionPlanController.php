<?php

namespace App\Http\Controllers\Api;

use App\Enums\FamilyEnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\CompleteAidDistributionPlanCycleRequest;
use App\Http\Requests\StoreAidDistributionPlanRequest;
use App\Models\AidDistributionPlan;
use App\Models\AidDistributionPlanLine;
use App\Models\Family;
use App\Services\AidDistributionFulfillmentService;
use App\Services\AppNotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AidDistributionPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = AidDistributionPlan::query()
            ->with('creator:id,name,email')
            ->with('campaign:id,title,status,goal_amount,raised_amount,spent_amount')
            ->with('inventoryItem:id,name,item_code,quantity_remaining,status')
            ->withCount('lines')
            ->latest()
            ->paginate(15);

        $plans->setCollection(
            $plans->getCollection()->map(function (AidDistributionPlan $plan): AidDistributionPlan {
                $cycles = max(1, (int) $plan->cycles_per_year);
                $completed = min((int) $plan->completed_cycles, $cycles);
                $plan->setAttribute('progress_percentage', round(($completed / $cycles) * 100, 2));
                $plan->setAttribute('remaining_cycles', max(0, $cycles - $completed));

                return $plan;
            })
        );

        return response()->json($plans);
    }

    public function show(AidDistributionPlan $aidDistributionPlan): JsonResponse
    {
        $plan = $aidDistributionPlan->load([
            'creator:id,name,email',
            'campaign:id,title,status',
            'inventoryItem:id,name,item_code,quantity_remaining,status',
            'lines' => fn ($query) => $query->orderBy('allocation_rank')->orderBy('id'),
            'lines.beneficiary:id,name,national_id,phone,family_id',
            'lines.family:id,family_code,head_name,phone,housing_status',
            'lines.lastAidRequest:id,status,type',
        ]);

        $cycles = max(1, (int) $plan->cycles_per_year);
        $completed = min((int) $plan->completed_cycles, $cycles);
        $plan->setAttribute('progress_percentage', round(($completed / $cycles) * 100, 2));
        $plan->setAttribute('remaining_cycles', max(0, $cycles - $completed));

        return response()->json([
            'plan' => $plan,
            'beneficiaries' => $plan->lines->map(function (AidDistributionPlanLine $line): array {
                $isCash = $line->allocated_amount !== null;

                return [
                    'line_id' => $line->id,
                    'allocation_rank' => $line->allocation_rank,
                    'beneficiary_id' => $line->beneficiary_id,
                    'beneficiary_name' => $line->beneficiary?->name,
                    'beneficiary_phone' => $line->beneficiary?->phone,
                    'national_id' => $line->beneficiary?->national_id,
                    'family_id' => $line->family_id,
                    'family_code' => $line->family?->family_code,
                    'family_head' => $line->family?->head_name,
                    'family_phone' => $line->family?->phone,
                    'housing_status' => $line->family?->housing_status,
                    'allocated_amount' => $line->allocated_amount,
                    'allocated_units' => $line->allocated_units,
                    'allocation_note' => $line->allocation_note,
                    'value_label' => $isCash
                        ? number_format((float) $line->allocated_amount, 2).' $'
                        : ((int) $line->allocated_units).' وحدة',
                    'last_fulfilled_cycle' => (int) $line->last_fulfilled_cycle,
                    'executed' => (int) $line->last_fulfilled_cycle > 0 || (int) $plan->completed_cycles > 0,
                    'aid_request_id' => $line->last_aid_request_id,
                    'aid_request_status' => $line->lastAidRequest?->status,
                ];
            })->values(),
        ]);
    }

    public function store(StoreAidDistributionPlanRequest $request, AppNotificationService $notifier): JsonResponse
    {
        $validated = $request->validated();

        $filterCriteria = $validated['filter_criteria'] ?? [];
        $distributionFrequency = (string) ($validated['distribution_frequency'] ?? 'once');
        $cyclesPerYear = $this->cyclesPerYear($distributionFrequency);
        $itemLabel = trim((string) ($validated['item_label'] ?? '')) ?: $validated['title'];

        $eligibleFamilies = Family::query()
            ->where('enrollment_status', FamilyEnrollmentStatus::Approved->value)
            ->where('has_direct_income', false)
            ->whereNull('aid_paused_at')
            ->with(['beneficiaries' => fn ($query) => $query->orderByDesc('is_head_of_family')->orderBy('id')])
            ->get()
            ->filter(fn (Family $family): bool => $this->matchesFilterCriteria($family, $filterCriteria))
            ->sortByDesc(fn (Family $family): int => $this->priorityScore($family))
            ->values();

        if ($eligibleFamilies->isEmpty()) {
            throw ValidationException::withMessages([
                'eligible_families' => [__('No eligible families found for this distribution plan.')],
            ]);
        }

        $plan = DB::transaction(function () use (
            $request,
            $validated,
            $eligibleFamilies,
            $filterCriteria,
            $distributionFrequency,
            $cyclesPerYear,
            $itemLabel
        ): AidDistributionPlan {
            $plan = AidDistributionPlan::query()->create([
                'title' => $validated['title'],
                'aid_type' => $validated['aid_type'],
                'item_label' => $itemLabel,
                'inventory_item_id' => $validated['inventory_item_id'] ?? null,
                'campaign_id' => $validated['campaign_id'] ?? null,
                'distribution_date' => $validated['distribution_date'],
                'distribution_frequency' => $distributionFrequency,
                'cycles_per_year' => $cyclesPerYear,
                'eligible_families_count' => $eligibleFamilies->count(),
                'total_amount' => $validated['total_amount'] ?? null,
                'projected_annual_amount' => isset($validated['total_amount']) ? (float) $validated['total_amount'] * $cyclesPerYear : null,
                'total_units' => $validated['total_units'] ?? null,
                'projected_annual_units' => isset($validated['total_units']) ? (int) $validated['total_units'] * $cyclesPerYear : null,
                'status' => 'draft',
                'completed_cycles' => 0,
                'notes' => $validated['notes'] ?? null,
                'filter_criteria' => $filterCriteria ?: null,
                'created_by' => $request->user()->id,
            ]);

            if ($validated['aid_type'] === 'urgent_financial') {
                $this->createAmountLines($plan, (float) $validated['total_amount'], $eligibleFamilies->all());
            } else {
                $this->createUnitLines($plan, (int) $validated['total_units'], $eligibleFamilies->all());
            }

            return $plan;
        });

        $plan->load(['lines.beneficiary.user']);
        foreach ($plan->lines as $line) {
            $beneficiaryUser = $line->beneficiary?->user;
            if ($beneficiaryUser === null) {
                continue;
            }

            $isCash = $line->allocated_amount !== null;
            $detail = $isCash
                ? sprintf('%s بقيمة %s', $itemLabel, number_format((float) $line->allocated_amount, 2))
                : sprintf('%s (كمية %d)', $itemLabel, (int) $line->allocated_units);

            $notifier->notifyUser(
                $beneficiaryUser,
                'وصلك مساعدة من الجمعية',
                'تم تخصيص '.$detail.' ضمن خطة «'.$plan->title.'». راجع محفظتك للتفاصيل. التنفيذ يخصم من المستودع ويصدر رمز الاستلام.',
                '/app/beneficiary/wallet',
                [
                    'plan_id' => $plan->id,
                    'plan_line_id' => $line->id,
                    'item_label' => $itemLabel,
                ]
            );
        }

        return response()->json([
            'message' => __('Aid distribution plan created successfully.'),
            'plan' => $plan->load([
                'creator:id,name,email',
                'campaign:id,title,status,goal_amount,raised_amount,spent_amount',
                'inventoryItem:id,name,item_code,quantity_remaining,status',
                'lines.family',
                'lines.beneficiary',
            ]),
        ], 201);
    }

    public function completeCycle(
        CompleteAidDistributionPlanCycleRequest $request,
        AidDistributionPlan $aidDistributionPlan,
        AidDistributionFulfillmentService $fulfillment
    ): JsonResponse {
        $cyclesPerYear = max(1, (int) $aidDistributionPlan->cycles_per_year);
        $previousCycles = (int) $aidDistributionPlan->completed_cycles;
        $nextCompletedCycles = min($cyclesPerYear, $previousCycles + 1);
        $nextStatus = $nextCompletedCycles >= $cyclesPerYear ? 'completed' : 'in_progress';
        $inventoryItemId = $request->validated('inventory_item_id');

        if ($nextCompletedCycles > $previousCycles) {
            $fulfillment->fulfillCycle(
                $aidDistributionPlan,
                $nextCompletedCycles,
                $request->user(),
                $inventoryItemId !== null ? (int) $inventoryItemId : null
            );
        }

        $aidDistributionPlan->forceFill([
            'completed_cycles' => $nextCompletedCycles,
            'status' => $nextStatus,
        ])->save();

        return response()->json([
            'message' => __('Plan cycle marked as completed.'),
            'plan' => $aidDistributionPlan->fresh()->load([
                'creator:id,name,email',
                'inventoryItem:id,name,item_code,quantity_remaining,status',
            ]),
        ]);
    }

    /**
     * @param  array<int, Family>  $families
     */
    private function createAmountLines(AidDistributionPlan $plan, float $totalAmount, array $families): void
    {
        $count = count($families);
        $base = floor(($totalAmount / $count) * 100) / 100;
        $allocatedBase = $base * $count;
        $remainderCents = (int) round(($totalAmount - $allocatedBase) * 100);

        foreach ($families as $index => $family) {
            $extra = $index < $remainderCents ? 0.01 : 0.00;
            $beneficiary = $family->beneficiaries->first();

            AidDistributionPlanLine::query()->create([
                'aid_distribution_plan_id' => $plan->id,
                'family_id' => $family->id,
                'beneficiary_id' => $beneficiary?->id,
                'allocated_amount' => $base + $extra,
                'allocated_units' => null,
                'allocation_rank' => $index + 1,
                'allocation_note' => __('Equal-share financial allocation.'),
            ]);
        }
    }

    /**
     * @param  array<int, Family>  $families
     */
    private function createUnitLines(AidDistributionPlan $plan, int $totalUnits, array $families): void
    {
        $count = count($families);
        $base = intdiv($totalUnits, $count);
        $remainder = $totalUnits % $count;

        foreach ($families as $index => $family) {
            $beneficiary = $family->beneficiaries->first();

            AidDistributionPlanLine::query()->create([
                'aid_distribution_plan_id' => $plan->id,
                'family_id' => $family->id,
                'beneficiary_id' => $beneficiary?->id,
                'allocated_amount' => null,
                'allocated_units' => $base + ($index < $remainder ? 1 : 0),
                'allocation_rank' => $index + 1,
                'allocation_note' => __('Equal-share item allocation.'),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $criteria
     */
    private function matchesFilterCriteria(Family $family, array $criteria): bool
    {
        if ($criteria === []) {
            return true;
        }

        $children = $family->beneficiaries->where('family_relationship', 'child');
        $childrenCount = $children->count();

        if (isset($criteria['min_children']) && $childrenCount < (int) $criteria['min_children']) {
            return false;
        }

        if (isset($criteria['min_school_age_children'])) {
            $schoolAge = $children->filter(function ($child): bool {
                $age = $child->age ?? ($child->date_of_birth?->age);

                return $age !== null && $age >= 5 && $age <= 18;
            })->count();

            if ($schoolAge < (int) $criteria['min_school_age_children']) {
                return false;
            }
        }

        if (isset($criteria['min_children_under_18'])) {
            $childrenUnder18 = $children->filter(function ($child): bool {
                $age = $this->ageValue($child->age, $child->date_of_birth);

                return $age !== null && $age < 18;
            })->count();

            if ($childrenUnder18 < (int) $criteria['min_children_under_18']) {
                return false;
            }
        }

        if (isset($criteria['min_adults'])) {
            $adults = $family->beneficiaries->filter(function ($member): bool {
                $age = $this->ageValue($member->age, $member->date_of_birth);

                return $age !== null && $age >= 18;
            })->count();

            if ($adults < (int) $criteria['min_adults']) {
                return false;
            }
        }

        if (isset($criteria['min_family_members']) && $family->members_count < (int) $criteria['min_family_members']) {
            return false;
        }

        if (isset($criteria['max_monthly_income']) && (float) $family->monthly_income > (float) $criteria['max_monthly_income']) {
            return false;
        }

        if (! empty($criteria['urgent_need'])) {
            $needs = $family->urgent_needs ?? [];
            if (! in_array($criteria['urgent_need'], $needs, true)) {
                return false;
            }
        }

        if (! empty($criteria['health_priority_only'])) {
            $hasMedicalPriority = $family->beneficiaries->contains(function ($member): bool {
                $status = strtolower(trim((string) ($member->health_status ?? '')));

                return $status !== '' && ! in_array($status, ['good', 'stable', 'healthy'], true);
            });

            if (! $hasMedicalPriority) {
                return false;
            }
        }

        if (! empty($criteria['housing_statuses']) && is_array($criteria['housing_statuses'])) {
            $allowedHousingStatuses = array_filter(array_map(
                fn ($value): string => strtolower(trim((string) $value)),
                $criteria['housing_statuses'],
            ));

            if ($allowedHousingStatuses !== []) {
                $housingStatus = strtolower(trim((string) ($family->housing_status ?? '')));
                // توافق قيم قديمة (rent) مع القيمة الحالية (rented)
                $aliases = [
                    'rent' => 'rented',
                    'rented' => 'rented',
                ];
                $normalizedFamily = $aliases[$housingStatus] ?? $housingStatus;
                $normalizedAllowed = array_map(
                    fn (string $value): string => $aliases[$value] ?? $value,
                    $allowedHousingStatuses,
                );

                if (! in_array($normalizedFamily, $normalizedAllowed, true)) {
                    return false;
                }
            }
        }

        return true;
    }

    private function cyclesPerYear(string $distributionFrequency): int
    {
        return match ($distributionFrequency) {
            'quarterly' => 4,
            'yearly' => 1,
            default => 1,
        };
    }

    private function priorityScore(Family $family): int
    {
        $childrenUnder18 = $family->beneficiaries->filter(function ($member): bool {
            $age = $this->ageValue($member->age, $member->date_of_birth);

            return $age !== null && $age < 18;
        })->count();

        $healthCases = $family->beneficiaries->filter(function ($member): bool {
            $status = strtolower(trim((string) ($member->health_status ?? '')));

            return $status !== '' && ! in_array($status, ['good', 'stable', 'healthy'], true);
        })->count();

        $housingPriority = match (strtolower(trim((string) ($family->housing_status ?? '')))) {
            'rent', 'rented', 'displaced', 'temporary', 'shared' => 3,
            'borrowed', 'unsafe' => 2,
            default => 0,
        };

        return ($childrenUnder18 * 3) + ($healthCases * 2) + $housingPriority + (int) ($family->members_count ?? 0);
    }

    private function ageValue(mixed $age, mixed $dateOfBirth): ?int
    {
        if ($age !== null) {
            return (int) $age;
        }

        if ($dateOfBirth === null) {
            return null;
        }

        try {
            return Carbon::parse($dateOfBirth)->age;
        } catch (\Throwable) {
            return null;
        }
    }
}
