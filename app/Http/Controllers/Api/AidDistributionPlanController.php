<?php

namespace App\Http\Controllers\Api;

use App\Enums\FamilyEnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\PreviewAidDistributionPlanRequest;
use App\Http\Requests\StoreAidDistributionPlanRequest;
use App\Models\AidDistributionPlan;
use App\Models\AidDistributionPlanLine;
use App\Models\Family;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AidDistributionPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = AidDistributionPlan::query()
            ->with('creator:id,name,email')
            ->with('campaign:id,title,status,goal_amount,raised_amount,spent_amount')
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

    /**
     * Preview families that match the given filter criteria without creating a plan,
     * so the secretary can review and hand-pick which beneficiaries to include.
     */
    public function candidates(PreviewAidDistributionPlanRequest $request): JsonResponse
    {
        $filterCriteria = $request->validated('filter_criteria', []) ?? [];

        $eligibleFamilies = $this->eligibleFamilies($filterCriteria);

        return response()->json([
            'count' => $eligibleFamilies->count(),
            'families' => $eligibleFamilies->map(fn (Family $family): array => $this->serializeCandidateFamily($family))->values(),
        ]);
    }

    public function store(StoreAidDistributionPlanRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $filterCriteria = $validated['filter_criteria'] ?? [];
        $distributionFrequency = (string) ($validated['distribution_frequency'] ?? 'once');
        $cyclesPerYear = $this->cyclesPerYear($distributionFrequency);

        $eligibleFamilies = $this->eligibleFamilies($filterCriteria);

        $selectedFamilyIds = $validated['selected_family_ids'] ?? null;
        if ($selectedFamilyIds !== null && $selectedFamilyIds !== []) {
            $selectedIds = array_map('intval', $selectedFamilyIds);
            $eligibleFamilies = $eligibleFamilies
                ->filter(fn (Family $family): bool => in_array($family->id, $selectedIds, true))
                ->sortBy(fn (Family $family): int => array_search($family->id, $selectedIds, true))
                ->values();
        }

        if ($eligibleFamilies->isEmpty()) {
            throw ValidationException::withMessages([
                'eligible_families' => [__('No eligible families found for this distribution plan.')],
            ]);
        }

        $autoUnits = filter_var($validated['auto_units'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $unitBasedTypes = ['special_item', 'medical_prescription', 'food_basket', 'stationery'];

        if ($autoUnits && in_array($validated['aid_type'], $unitBasedTypes, true)) {
            $validated['total_units'] = $eligibleFamilies->count();
        }

        $plan = DB::transaction(function () use (
            $request,
            $validated,
            $eligibleFamilies,
            $filterCriteria,
            $distributionFrequency,
            $cyclesPerYear
        ): AidDistributionPlan {
            $plan = AidDistributionPlan::query()->create([
                'title' => $validated['title'],
                'aid_type' => $validated['aid_type'],
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

        return response()->json([
            'message' => __('Aid distribution plan created successfully.'),
            'plan' => $plan->load([
                'creator:id,name,email',
                'campaign:id,title,status,goal_amount,raised_amount,spent_amount',
                'lines.family',
                'lines.beneficiary',
            ]),
        ], 201);
    }

    public function completeCycle(AidDistributionPlan $aidDistributionPlan): JsonResponse
    {
        $cyclesPerYear = max(1, (int) $aidDistributionPlan->cycles_per_year);
        $nextCompletedCycles = min($cyclesPerYear, (int) $aidDistributionPlan->completed_cycles + 1);

        $nextStatus = $nextCompletedCycles >= $cyclesPerYear ? 'completed' : 'in_progress';

        $aidDistributionPlan->forceFill([
            'completed_cycles' => $nextCompletedCycles,
            'status' => $nextStatus,
        ])->save();

        return response()->json([
            'message' => __('Plan cycle marked as completed.'),
            'plan' => $aidDistributionPlan->fresh()->load('creator:id,name,email'),
        ]);
    }

    /**
     * @param  array<string, mixed>  $filterCriteria
     * @return Collection<int, Family>
     */
    private function eligibleFamilies(array $filterCriteria): Collection
    {
        return Family::query()
            ->where('enrollment_status', FamilyEnrollmentStatus::Approved->value)
            ->where('has_direct_income', false)
            ->whereNull('aid_paused_at')
            ->with(['beneficiaries' => fn ($query) => $query->orderByDesc('is_head_of_family')->orderBy('id')])
            ->get()
            ->filter(fn (Family $family): bool => $this->matchesFilterCriteria($family, $filterCriteria))
            ->sortByDesc(fn (Family $family): int => $this->priorityScore($family))
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCandidateFamily(Family $family): array
    {
        $head = $family->beneficiaries->firstWhere('is_head_of_family', true) ?? $family->beneficiaries->first();
        $healthCases = $family->beneficiaries->filter(function ($member): bool {
            $status = strtolower(trim((string) ($member->health_status ?? '')));

            return $status !== '' && ! in_array($status, ['good', 'stable', 'healthy'], true);
        })->count();

        return [
            'family_id' => $family->id,
            'family_code' => $family->family_code,
            'head_name' => $family->head_name ?? $head?->name,
            'head_beneficiary_id' => $head?->id,
            'members_count' => $family->members_count,
            'housing_status' => $family->housing_status,
            'monthly_income' => $family->monthly_income,
            'health_priority_cases' => $healthCases,
            'priority_score' => $this->priorityScore($family),
        ];
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
                if (! in_array($housingStatus, $allowedHousingStatuses, true)) {
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
