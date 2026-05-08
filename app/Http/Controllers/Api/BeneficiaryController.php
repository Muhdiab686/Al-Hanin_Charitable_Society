<?php

namespace App\Http\Controllers\Api;

use App\Enums\FamilyEnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBeneficiaryRequest;
use App\Http\Requests\UpdateBeneficiaryProfileRequest;
use App\Models\Beneficiary;
use App\Models\Family;
use App\Services\BeneficiaryCategoryAssigner;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class BeneficiaryController extends Controller
{
    public function index(): JsonResponse
    {
        $beneficiaries = Beneficiary::query()
            ->with(['family', 'category'])
            ->latest()
            ->paginate(15);

        return response()->json($beneficiaries);
    }

    public function store(StoreBeneficiaryRequest $request, BeneficiaryCategoryAssigner $assigner): JsonResponse
    {
        $validated = $request->validated();

        $beneficiary = DB::transaction(function () use ($validated, $assigner): Beneficiary {
            $enrollmentStatus = isset($validated['family']['enrollment_status'])
                ? FamilyEnrollmentStatus::from($validated['family']['enrollment_status'])
                : FamilyEnrollmentStatus::PendingBoard;

            $family = Family::query()->create([
                'family_code' => 'FAM-'.now()->format('YmdHis').'-'.fake()->numerify('####'),
                'head_name' => $validated['family']['head_name'],
                'phone' => $validated['family']['phone'] ?? null,
                'address' => $validated['family']['address'] ?? null,
                'members_count' => $validated['family']['members_count'],
                'monthly_income' => $validated['family']['monthly_income'] ?? 0,
                'enrollment_status' => $enrollmentStatus,
            ]);

            $beneficiary = Beneficiary::query()->create([
                'family_id' => $family->id,
                'category_id' => $validated['beneficiary']['category_id'] ?? null,
                'national_id' => $validated['beneficiary']['national_id'],
                'name' => $validated['beneficiary']['name'],
                'date_of_birth' => $validated['beneficiary']['date_of_birth'] ?? null,
                'phone' => $validated['beneficiary']['phone'] ?? null,
                'notes' => $validated['beneficiary']['notes'] ?? null,
                'is_head_of_family' => $validated['beneficiary']['is_head_of_family'] ?? false,
            ]);

            if (! isset($validated['beneficiary']['category_id'])) {
                $assigner->assign($beneficiary);
            }

            return $beneficiary;
        });

        return response()->json([
            'message' => 'Beneficiary created successfully.',
            'beneficiary' => $beneficiary->load(['family', 'category']),
        ], 201);
    }

    public function update(
        UpdateBeneficiaryProfileRequest $request,
        Beneficiary $beneficiary,
        BeneficiaryCategoryAssigner $assigner
    ): JsonResponse {
        $beneficiary->forceFill($request->validated())->save();
        $assigner->assign($beneficiary);

        return response()->json([
            'message' => __('Beneficiary updated successfully.'),
            'beneficiary' => $beneficiary->fresh()->load(['family', 'category']),
        ]);
    }

    public function recalculateCategory(Beneficiary $beneficiary, BeneficiaryCategoryAssigner $assigner): JsonResponse
    {
        $assigner->assign($beneficiary);

        return response()->json([
            'message' => __('Beneficiary category recalculated successfully.'),
            'beneficiary' => $beneficiary->fresh()->load(['family', 'category']),
        ]);
    }
}
