<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAidRequestRequest;
use App\Models\AidRequest;
use App\Models\ApprovalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class AidRequestController extends Controller
{
    #[OA\Get(
        path: '/api/v1/aid-requests',
        summary: 'List aid requests',
        security: [['sanctum' => []]],
        tags: ['Aid Requests'],
        responses: [new OA\Response(response: 200, description: 'Aid request list')]
    )]
    public function index(Request $request): JsonResponse
    {
        $query = AidRequest::query()->with(['beneficiary', 'approvals']);

        if ($request->user()->hasRole('beneficiary')) {
            $query->where('created_by', $request->user()->id);
        }

        return response()->json($query->latest()->paginate(15));
    }

    #[OA\Post(
        path: '/api/v1/aid-requests',
        summary: 'Create aid request',
        security: [['sanctum' => []]],
        tags: ['Aid Requests'],
        responses: [new OA\Response(response: 201, description: 'Created')]
    )]
    public function store(StoreAidRequestRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $aidRequest = AidRequest::query()->create([
            'beneficiary_id' => $validated['beneficiary_id'],
            'created_by' => $request->user()->id,
            'type' => $validated['type'],
            'requested_amount' => $validated['requested_amount'] ?? null,
            'description' => $validated['description'],
            'status' => 'pending',
            'submitted_at' => now(),
        ]);

        ApprovalRequest::query()->create([
            'aid_request_id' => $aidRequest->id,
            'decision' => 'pending',
        ]);

        return response()->json([
            'message' => 'Aid request submitted successfully.',
            'aid_request' => $aidRequest->load(['beneficiary', 'approvals']),
        ], 201);
    }
}
