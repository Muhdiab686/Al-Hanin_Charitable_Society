<?php

namespace App\Http\Controllers\Api;

use App\Enums\FamilyEnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAidDistributionPlanRequest;
use App\Models\AidDistributionPlan;
use App\Models\AidDistributionPlanLine;
use App\Models\Family;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AidDistributionPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = AidDistributionPlan::query()
            ->with('creator:id,name,email')
            ->withCount('lines')
            ->latest()
            ->paginate(15);

        return response()->json($plans);
    }

    public function store(StoreAidDistributionPlanRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $filterCriteria = $validated['filter_criteria'] ?? [];

        $eligibleFamilies = Family::query()
            ->where('enrollment_status', FamilyEnrollmentStatus::Approved->value)
            ->where('has_direct_income', false)
            ->whereNull('aid_paused_at')
            ->with(['beneficiaries' => fn ($query) => $query->orderByDesc('is_head_of_family')->orderBy('id')])
            ->get()
            ->filter(fn (Family $family): bool => $this->matchesFilterCriteria($family, $filterCriteria))
            ->values();

        if ($eligibleFamilies->isEmpty()) {
            throw ValidationException::withMessages([
                'eligible_families' => [__('No eligible families found for this distribution plan.')],
            ]);
        }

        $plan = DB::transaction(function () use ($request, $validated, $eligibleFamilies, $filterCriteria): AidDistributionPlan {
            $plan = AidDistributionPlan::query()->create([
                'title' => $validated['title'],
                'aid_type' => $validated['aid_type'],
                'distribution_date' => $validated['distribution_date'],
                'eligible_families_count' => $eligibleFamilies->count(),
                'total_amount' => $validated['total_amount'] ?? null,
                'total_units' => $validated['total_units'] ?? null,
                'status' => 'draft',
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
            'plan' => $plan->load(['creator:id,name,email', 'lines.family', 'lines.beneficiary']),
        ], 201);
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

        return true;
    }
}
