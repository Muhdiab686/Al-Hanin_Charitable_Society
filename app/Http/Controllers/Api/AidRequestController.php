<?php

namespace App\Http\Controllers\Api;

use App\Enums\InventoryItemStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\AidRequestReviewRequest;
use App\Http\Requests\ConfirmAidDeliveryRequest;
use App\Http\Requests\StoreAidInventoryDistributionRequest;
use App\Http\Requests\StoreAidRequestRequest;
use App\Models\AidInventoryAllocation;
use App\Models\AidRequest;
use App\Models\ApprovalRequest;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AidRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AidRequest::query()->with([
            'beneficiary',
            'approvals',
            'inventoryAllocations.inventoryItem',
            'inventoryAllocations.deliveryOfficer:id,name,email',
        ]);

        if ($request->user()?->hasRole('beneficiary')) {
            $query->where('created_by', $request->user()->id);
        }

        return response()->json($query->latest()->paginate(15));
    }

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

    public function review(AidRequestReviewRequest $request, AidRequest $aidRequest): JsonResponse
    {
        if ($aidRequest->status !== 'pending') {
            throw ValidationException::withMessages([
                'aid_request' => [__('Only pending aid requests can be reviewed.')],
            ]);
        }

        $approval = $aidRequest->approvals()->where('decision', 'pending')->first();

        if ($approval === null) {
            throw ValidationException::withMessages([
                'aid_request' => [__('No pending approval record exists for this aid request.')],
            ]);
        }

        $validated = $request->validated();

        DB::transaction(function () use ($aidRequest, $approval, $request, $validated): void {
            $approval->forceFill([
                'reviewed_by' => $request->user()->id,
                'decision' => $validated['decision'],
                'review_note' => $validated['review_note'] ?? null,
                'reviewed_at' => now(),
            ])->save();

            $aidRequest->forceFill(['status' => $validated['decision']])->save();
        });

        return response()->json([
            'message' => 'Aid request reviewed successfully.',
            'aid_request' => $aidRequest->fresh()->load(['beneficiary.family', 'approvals.reviewer']),
        ]);
    }

    public function storeInventoryDistribution(StoreAidInventoryDistributionRequest $request, AidRequest $aidRequest): JsonResponse
    {
        $validated = $request->validated();

        $allocations = DB::transaction(function () use ($request, $aidRequest, $validated): array {
            $created = [];

            foreach ($validated['items'] as $line) {
                $item = InventoryItem::query()
                    ->whereKey($line['inventory_item_id'])
                    ->lockForUpdate()
                    ->first();

                if ($item === null || $item->status !== InventoryItemStatus::Stored) {
                    throw ValidationException::withMessages([
                        'items' => [__('One or more inventory items are unavailable or not in stored status.')],
                    ]);
                }

                if ($item->quantity_remaining < $line['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => [__('Insufficient quantity remaining for item :code.', ['code' => $item->item_code])],
                    ]);
                }

                $allocation = AidInventoryAllocation::query()->create([
                    'aid_request_id' => $aidRequest->id,
                    'inventory_item_id' => $item->id,
                    'quantity' => $line['quantity'],
                    'distributed_by' => $request->user()->id,
                    'notes' => $line['notes'] ?? null,
                ]);

                $item->quantity_remaining -= $line['quantity'];

                if ($item->quantity_remaining === 0) {
                    $item->status = InventoryItemStatus::Distributed;
                }

                $item->save();

                $created[] = $allocation->load('inventoryItem');
            }

            return $created;
        });

        return response()->json([
            'message' => __('Inventory allocated successfully.'),
            'allocations' => $allocations,
            'aid_request' => $aidRequest->fresh()->load([
                'beneficiary.family',
                'approvals',
                'inventoryAllocations.inventoryItem',
            ]),
        ], 201);
    }

    public function confirmDelivery(ConfirmAidDeliveryRequest $request, AidRequest $aidRequest): JsonResponse
    {
        $validated = $request->validated();

        $result = DB::transaction(function () use ($request, $aidRequest, $validated): array {
            $allocations = AidInventoryAllocation::query()
                ->where('aid_request_id', $aidRequest->id)
                ->whereIn('id', $validated['allocation_ids'])
                ->lockForUpdate()
                ->get();

            if ($allocations->count() !== count($validated['allocation_ids'])) {
                throw ValidationException::withMessages([
                    'allocation_ids' => [__('One or more allocation records do not belong to this aid request.')],
                ]);
            }

            if ($allocations->contains(fn (AidInventoryAllocation $allocation): bool => $allocation->delivered_at !== null)) {
                throw ValidationException::withMessages([
                    'allocation_ids' => [__('One or more allocations were already delivered.')],
                ]);
            }

            foreach ($allocations as $allocation) {
                $allocation->forceFill([
                    'delivered_by' => $request->user()->id,
                    'delivered_at' => now(),
                    'delivery_note' => $validated['delivery_note'] ?? null,
                ])->save();
            }

            return $allocations
                ->load(['inventoryItem', 'distributor:id,name,email', 'deliveryOfficer:id,name,email'])
                ->values()
                ->all();
        });

        return response()->json([
            'message' => __('Aid delivery confirmed successfully.'),
            'deliveries' => $result,
            'aid_request' => $aidRequest->fresh()->load([
                'beneficiary.family',
                'inventoryAllocations.inventoryItem',
                'inventoryAllocations.distributor:id,name,email',
                'inventoryAllocations.deliveryOfficer:id,name,email',
            ]),
        ]);
    }
}
