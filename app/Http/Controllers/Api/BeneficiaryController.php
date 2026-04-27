<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBeneficiaryRequest;
use App\Models\Beneficiary;
use App\Models\Family;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class BeneficiaryController extends Controller
{
    #[OA\Get(
        path: '/api/v1/beneficiaries',
        summary: 'List beneficiaries',
        security: [['sanctum' => []]],
        tags: ['Beneficiaries'],
        responses: [new OA\Response(response: 200, description: 'Beneficiaries list')]
    )]
    public function index(): JsonResponse
    {
        $beneficiaries = Beneficiary::query()
            ->with(['family', 'category'])
            ->latest()
            ->paginate(15);

        return response()->json($beneficiaries);
    }

    #[OA\Post(
        path: '/api/v1/beneficiaries',
        summary: 'Create beneficiary with family',
        security: [['sanctum' => []]],
        tags: ['Beneficiaries'],
        responses: [new OA\Response(response: 201, description: 'Created')]
    )]
    public function store(StoreBeneficiaryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $beneficiary = DB::transaction(function () use ($validated): Beneficiary {
            $family = Family::query()->create([
                'family_code' => 'FAM-'.now()->format('YmdHis').'-'.fake()->numerify('####'),
                'head_name' => $validated['family']['head_name'],
                'phone' => $validated['family']['phone'] ?? null,
                'address' => $validated['family']['address'] ?? null,
                'members_count' => $validated['family']['members_count'],
                'monthly_income' => $validated['family']['monthly_income'] ?? 0,
            ]);

            return Beneficiary::query()->create([
                'family_id' => $family->id,
                'category_id' => $validated['beneficiary']['category_id'] ?? null,
                'national_id' => $validated['beneficiary']['national_id'],
                'name' => $validated['beneficiary']['name'],
                'date_of_birth' => $validated['beneficiary']['date_of_birth'] ?? null,
                'phone' => $validated['beneficiary']['phone'] ?? null,
                'notes' => $validated['beneficiary']['notes'] ?? null,
                'is_head_of_family' => $validated['beneficiary']['is_head_of_family'] ?? false,
            ]);
        });

        return response()->json([
            'message' => 'Beneficiary created successfully.',
            'beneficiary' => $beneficiary->load(['family', 'category']),
        ], 201);
    }
}
