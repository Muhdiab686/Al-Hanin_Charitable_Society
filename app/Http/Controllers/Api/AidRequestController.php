<?php

namespace App\Http\Controllers\Api;

use App\Enums\InventoryItemStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\AidRequestReviewRequest;
use App\Http\Requests\ConfirmAidDeliveryRequest;
use App\Http\Requests\ConfirmBeneficiaryAidDeliveryByQrRequest;
use App\Http\Requests\PublishAidRequestForDonorsRequest;
use App\Http\Requests\StoreAidInventoryDistributionRequest;
use App\Http\Requests\StoreAidRequestRequest;
use App\Models\AidInventoryAllocation;
use App\Models\AidRequest;
use App\Models\AidRequestAttachment;
use App\Models\ApprovalRequest;
use App\Models\Beneficiary;
use App\Models\Family;
use App\Models\InventoryItem;
use App\Services\AppNotificationService;
use App\Support\AidRequestTypeGroups;
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
            'attachments',
            'inventoryAllocations.inventoryItem',
            'inventoryAllocations.deliveryOfficer:id,name,email',
            'publisher:id,name,email',
        ]);

        $user = $request->user();

        if ($user?->hasRole('beneficiary')) {
            $beneficiaryId = Beneficiary::query()
                ->where('user_id', $user->id)
                ->value('id');

            $query->where('beneficiary_id', $beneficiaryId ?? 0);
        } elseif ($user?->hasRole('secretary') && ! $user->hasRole('recording_secretary') && ! $user->hasRole('admin')) {
            $query->whereIn('type', AidRequestTypeGroups::MEDICAL);
        } elseif ($user?->hasRole('storekeeper') && ! $user->hasRole('admin')) {
            $query->whereIn('type', AidRequestTypeGroups::LIVELIHOOD);
        }

        if ($request->filled('type')) {
            $query->where('type', (string) $request->string('type'));
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

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('aid-requests/'.$aidRequest->id, 'local');
                AidRequestAttachment::query()->create([
                    'aid_request_id' => $aidRequest->id,
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size_bytes' => $file->getSize(),
                ]);
            }
        }

        return response()->json([
            'message' => 'Aid request submitted successfully.',
            'aid_request' => $aidRequest->load(['beneficiary', 'approvals', 'attachments']),
        ], 201);
    }

    public function review(
        AidRequestReviewRequest $request,
        AidRequest $aidRequest,
        AppNotificationService $notifier
    ): JsonResponse {
        $this->assertCanManageAidRequestType($request, $aidRequest);

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

        $notifier->notifyUser(
            $aidRequest->beneficiary?->user,
            'تحديث طلب المساعدة',
            'تمت مراجعة طلب المساعدة الخاص بك وحالته الآن: '.$aidRequest->status,
            '/app/beneficiary/aid',
            ['aid_request_id' => $aidRequest->id, 'status' => $aidRequest->status]
        );

        return response()->json([
            'message' => 'Aid request reviewed successfully.',
            'aid_request' => $aidRequest->fresh()->load(['beneficiary.family', 'approvals.reviewer', 'attachments']),
        ]);
    }

    public function publishForDonors(
        PublishAidRequestForDonorsRequest $request,
        AidRequest $aidRequest,
        AppNotificationService $notifier
    ): JsonResponse {
        $this->assertCanManageAidRequestType($request, $aidRequest);

        if ($aidRequest->status !== 'approved') {
            throw ValidationException::withMessages([
                'aid_request' => [__('Only approved aid requests can be published for donors.')],
            ]);
        }

        $validated = $request->validated();

        $aidRequest->forceFill([
            'public_title' => $validated['public_title'],
            'public_summary' => $validated['public_summary'],
            'published_for_donors_at' => now(),
            'published_by' => $request->user()->id,
        ])->save();

        $notifier->notifyRoles(
            ['donor'],
            'حالة طارئة جديدة',
            'تم نشر حالة مساعدة طارئة جديدة للمتبرعين.',
            '/app/donor/urgent-aid',
            ['aid_request_id' => $aidRequest->id]
        );

        return response()->json([
            'message' => __('Aid request published for donors successfully.'),
            'aid_request' => $aidRequest->fresh()->load(['attachments', 'publisher:id,name,email']),
        ]);
    }

    public function storeInventoryDistribution(
        StoreAidInventoryDistributionRequest $request,
        AidRequest $aidRequest,
        AppNotificationService $notifier
    ): JsonResponse {
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

        $aidRequest->loadMissing('beneficiary.user');
        $itemNames = collect($allocations)
            ->map(fn ($allocation): string => trim((string) ($allocation->inventoryItem?->name ?? 'مادة')))
            ->filter()
            ->unique()
            ->values()
            ->all();
        $summary = $itemNames === [] ? 'مواد عينية' : implode('، ', $itemNames);

        $notifier->notifyUser(
            $aidRequest->beneficiary?->user,
            'تم تخصيص مساعدة عينية لك',
            'تم تخصيص «'.$summary.'» ضمن طلب المساعدة #'.$aidRequest->id.'. راجع محفظتك.',
            '/app/beneficiary/wallet',
            [
                'aid_request_id' => $aidRequest->id,
                'item_labels' => $itemNames,
            ]
        );

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

    public function confirmDelivery(
        ConfirmAidDeliveryRequest $request,
        AidRequest $aidRequest,
        AppNotificationService $notifier
    ): JsonResponse {
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

                BeneficiaryMedicalWalletController::recordMaterialAllocationDelivery($allocation, $request);
            }

            $pending = AidInventoryAllocation::query()
                ->where('aid_request_id', $aidRequest->id)
                ->whereNull('delivered_at')
                ->exists();

            if (! $pending) {
                $aidRequest->forceFill(['status' => 'fulfilled'])->save();
            }

            return $allocations
                ->load(['inventoryItem', 'distributor:id,name,email', 'deliveryOfficer:id,name,email'])
                ->values()
                ->all();
        });

        if ($aidRequest->fresh()->status === 'fulfilled') {
            BeneficiaryMedicalWalletController::creditCashAidRequestIfNeeded($aidRequest->fresh(), $request);

            $notifier->notifyUser(
                $aidRequest->beneficiary?->user,
                'تم تسليم المساعدة',
                'تم تأكيد تسليم المساعدة الخاصة بطلبك.',
                '/app/beneficiary/aid',
                ['aid_request_id' => $aidRequest->id]
            );
        }

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

    public function confirmBeneficiaryDeliveryByQr(
        ConfirmBeneficiaryAidDeliveryByQrRequest $request,
        AppNotificationService $notifier
    ): JsonResponse {
        $beneficiary = Beneficiary::query()
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $payload = $request->validated('payload');
        $token = substr($payload, strlen('hanin:'));

        $family = Family::query()
            ->whereKey($beneficiary->family_id)
            ->where('qr_token', $token)
            ->where('enrollment_status', 'approved')
            ->first();

        if ($family === null) {
            throw ValidationException::withMessages([
                'payload' => [__('QR code does not match your approved family profile.')],
            ]);
        }

        $validated = $request->validated();

        $deliveries = DB::transaction(function () use ($beneficiary, $validated, $request): array {
            $query = AidInventoryAllocation::query()
                ->whereNull('delivered_at')
                ->whereHas('aidRequest', function ($aidRequestQuery) use ($beneficiary): void {
                    $aidRequestQuery
                        ->where('beneficiary_id', $beneficiary->id)
                        ->whereIn('status', ['approved', 'fulfilled']);
                });

            if (! empty($validated['aid_request_id'])) {
                $query->where('aid_request_id', (int) $validated['aid_request_id']);
            }

            $pendingAllocations = $query->lockForUpdate()->get();

            if ($pendingAllocations->isEmpty()) {
                throw ValidationException::withMessages([
                    'aid_request_id' => [__('No pending delivered baskets found for confirmation.')],
                ]);
            }

            $deliveryNote = $validated['delivery_note'] ?? 'Beneficiary confirmed receipt via family QR.';
            foreach ($pendingAllocations as $allocation) {
                $allocation->forceFill([
                    'delivered_by' => $request->user()->id,
                    'delivered_at' => now(),
                    'delivery_note' => $deliveryNote,
                ])->save();

                BeneficiaryMedicalWalletController::recordMaterialAllocationDelivery($allocation, $request);
            }

            $aidRequestIds = $pendingAllocations->pluck('aid_request_id')->unique()->values();
            foreach ($aidRequestIds as $aidRequestId) {
                $hasPending = AidInventoryAllocation::query()
                    ->where('aid_request_id', $aidRequestId)
                    ->whereNull('delivered_at')
                    ->exists();
                if (! $hasPending) {
                    AidRequest::query()
                        ->whereKey($aidRequestId)
                        ->update(['status' => 'fulfilled']);

                    $fulfilledRequest = AidRequest::query()->with('beneficiary')->find($aidRequestId);
                    if ($fulfilledRequest !== null) {
                        BeneficiaryMedicalWalletController::creditCashAidRequestIfNeeded($fulfilledRequest, $request);
                    }
                }
            }

            return $pendingAllocations
                ->load(['aidRequest', 'inventoryItem', 'deliveryOfficer:id,name,email'])
                ->values()
                ->all();
        });

        $notifier->notifyRoles(
            ['storekeeper', 'volunteer', 'recording_secretary', 'secretary'],
            'تأكيد استلام مساعدة عبر التطبيق',
            'قام المستفيد بتأكيد استلام المساعدة عبر QR من التطبيق.',
            '/app/storekeeper/aid',
            ['beneficiary_id' => $beneficiary->id]
        );

        return response()->json([
            'message' => __('Aid receipt confirmed successfully.'),
            'deliveries' => $deliveries,
        ]);
    }

    private function assertCanManageAidRequestType(Request $request, AidRequest $aidRequest): void
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        if ($user->hasRole('admin') || $user->hasRole('recording_secretary')) {
            return;
        }

        $type = (string) $aidRequest->type;

        if ($user->hasRole('secretary') && AidRequestTypeGroups::isMedical($type)) {
            return;
        }

        if ($user->hasRole('storekeeper') && AidRequestTypeGroups::isLivelihood($type)) {
            return;
        }

        throw ValidationException::withMessages([
            'aid_request' => [__('You are not allowed to manage this aid request type.')],
        ]);
    }
}
