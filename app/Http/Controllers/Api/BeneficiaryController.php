<?php

namespace App\Http\Controllers\Api;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\FamilyRelationship;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBeneficiaryRequest;
use App\Http\Requests\UpdateBeneficiaryProfileRequest;
use App\Models\Beneficiary;
use App\Models\Family;
use App\Services\BeneficiaryCategoryAssigner;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BeneficiaryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Beneficiary::query()->with(['family', 'category'])->latest();

        $search = trim((string) $request->query('search', ''));

        if ($search !== '') {
            $like = '%'.addcslashes($search, '%_\\').'%';

            $query->where(function (Builder $q) use ($like, $search): void {
                $q->where('name', 'like', $like)
                    ->orWhere('national_id', 'like', $like);

                if (ctype_digit($search)) {
                    $n = (int) $search;
                    $q->orWhere('id', $n)->orWhere('family_id', $n);
                }

                $q->orWhereHas('family', function (Builder $fam) use ($like, $search): void {
                    $fam->where('family_code', 'like', $like);

                    if (ctype_digit($search)) {
                        $fam->orWhere('id', (int) $search);
                    }
                });
            });
        }

        return response()->json($query->paginate(15));
    }

    public function show(Beneficiary $beneficiary): JsonResponse
    {
        return response()->json([
            'beneficiary' => $beneficiary->load(['family', 'category']),
        ]);
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

            $relationship = isset($validated['beneficiary']['family_relationship'])
                ? FamilyRelationship::from($validated['beneficiary']['family_relationship'])
                : FamilyRelationship::Head;
            $isHead = $validated['beneficiary']['is_head_of_family'] ?? ($relationship === FamilyRelationship::Head);

            $beneficiary = Beneficiary::query()->create([
                'family_id' => $family->id,
                'category_id' => $validated['beneficiary']['category_id'] ?? null,
                'national_id' => $validated['beneficiary']['national_id'],
                'name' => $validated['beneficiary']['name'],
                'date_of_birth' => $validated['beneficiary']['date_of_birth'] ?? null,
                'phone' => $validated['beneficiary']['phone'] ?? null,
                'gender' => $validated['beneficiary']['gender'] ?? null,
                'notes' => $validated['beneficiary']['notes'] ?? null,
                'is_head_of_family' => $isHead,
                'family_relationship' => $relationship->value,
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
