<?php

namespace App\Services;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\InventoryItemStatus;
use App\Models\AidDistributionPlan;
use App\Models\AidInventoryAllocation;
use App\Models\AidRequest;
use App\Models\Family;
use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class AidDistributionFulfillmentService
{
    public function __construct(
        private readonly AppNotificationService $notifier,
        private readonly FamilyQrCodeGenerator $qrGenerator,
    ) {}

    /**
     * Execute one distribution cycle: deduct inventory for in-kind plans,
     * create approved aid requests + pending allocations, ensure family QR tokens.
     */
    public function fulfillCycle(AidDistributionPlan $plan, int $cycleNumber, User $actor, ?int $inventoryItemId = null): void
    {
        if ($cycleNumber < 1) {
            return;
        }

        if ($plan->aid_type === 'urgent_financial') {
            $this->ensureFamilyQrTokens($plan);
            $this->notifyBeneficiariesCashCycle($plan, $cycleNumber);

            return;
        }

        DB::transaction(function () use ($plan, $cycleNumber, $actor, $inventoryItemId): void {
            $plan->refresh();
            $plan->load(['lines.beneficiary.user', 'lines.family']);

            $linesToFulfill = [];
            $neededUnits = 0;

            foreach ($plan->lines as $line) {
                if ((int) $line->last_fulfilled_cycle >= $cycleNumber) {
                    continue;
                }

                $units = (int) ($line->allocated_units ?? 0);
                if ($units < 1 || $line->beneficiary_id === null) {
                    continue;
                }

                $neededUnits += $units;
                $linesToFulfill[] = $line;
            }

            if ($linesToFulfill === []) {
                return;
            }

            $item = $this->resolveInventoryItem($plan, $inventoryItemId);
            $item = InventoryItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();

            if ($item->status !== InventoryItemStatus::Stored) {
                throw ValidationException::withMessages([
                    'inventory_item_id' => [__('Selected inventory item is not available in stored status.')],
                ]);
            }

            if ((int) $item->quantity_remaining < $neededUnits) {
                throw ValidationException::withMessages([
                    'inventory_item_id' => [__(
                        'Insufficient inventory quantity. Needed :needed, remaining :remaining for :item.',
                        [
                            'needed' => $neededUnits,
                            'remaining' => (int) $item->quantity_remaining,
                            'item' => $item->name ?: $item->item_code,
                        ]
                    )],
                ]);
            }

            if ($plan->inventory_item_id !== $item->id) {
                $plan->forceFill(['inventory_item_id' => $item->id])->save();
            }

            $itemLabel = trim((string) ($plan->item_label ?: $item->name ?: $plan->title));
            $fulfilledCount = 0;

            foreach ($linesToFulfill as $line) {
                $units = (int) $line->allocated_units;
                $family = $line->family;
                if ($family !== null) {
                    $this->ensureFamilyQrToken($family);
                }

                $aidRequest = AidRequest::query()->create([
                    'beneficiary_id' => $line->beneficiary_id,
                    'created_by' => $actor->id,
                    'type' => $plan->aid_type,
                    'requested_amount' => null,
                    'description' => sprintf(
                        'توزيع من خطة «%s» — الدورة %d — %s × %d',
                        $plan->title,
                        $cycleNumber,
                        $itemLabel,
                        $units
                    ),
                    'status' => 'approved',
                    'submitted_at' => now(),
                ]);

                AidInventoryAllocation::query()->create([
                    'aid_request_id' => $aidRequest->id,
                    'inventory_item_id' => $item->id,
                    'quantity' => $units,
                    'distributed_by' => $actor->id,
                    'notes' => sprintf('Plan #%d cycle %d line #%d', $plan->id, $cycleNumber, $line->id),
                ]);

                $item->quantity_remaining = (int) $item->quantity_remaining - $units;

                $line->forceFill([
                    'last_fulfilled_cycle' => $cycleNumber,
                    'last_aid_request_id' => $aidRequest->id,
                ])->save();

                $fulfilledCount++;

                $beneficiaryUser = $line->beneficiary?->user;
                $qrPayload = $family?->qr_token
                    ? $this->qrGenerator->formatPayload((string) $family->qr_token)
                    : null;

                $this->notifier->notifyUser(
                    $beneficiaryUser,
                    'جاهزة للاستلام: '.$itemLabel,
                    $qrPayload
                        ? sprintf(
                            'تم تجهيز %s (كمية %d) من خطة «%s». رمز تأكيد الاستلام: %s — استخدمه من صفحة المساعدات.',
                            $itemLabel,
                            $units,
                            $plan->title,
                            $qrPayload
                        )
                        : sprintf(
                            'تم تجهيز %s (كمية %d) من خطة «%s». راجع صفحة المساعدات لتأكيد الاستلام.',
                            $itemLabel,
                            $units,
                            $plan->title
                        ),
                    '/app/beneficiary/aid',
                    [
                        'plan_id' => $plan->id,
                        'aid_request_id' => $aidRequest->id,
                        'item_label' => $itemLabel,
                        'receipt_qr_payload' => $qrPayload,
                    ]
                );
            }

            if ((int) $item->quantity_remaining === 0) {
                $item->status = InventoryItemStatus::Distributed;
            }
            $item->save();

            $this->notifier->notifyRoles(
                ['storekeeper'],
                'خصم مخزون من خطة توزيع',
                sprintf(
                    'تم تنفيذ الدورة %d لخطة «%s»: خصم %d وحدة من «%s» لـ %d مستفيد. بانتظار تأكيد الاستلام.',
                    $cycleNumber,
                    $plan->title,
                    $neededUnits,
                    $item->name ?: $item->item_code,
                    $fulfilledCount
                ),
                '/app/storekeeper/aid',
                [
                    'plan_id' => $plan->id,
                    'inventory_item_id' => $item->id,
                    'cycle' => $cycleNumber,
                    'units' => $neededUnits,
                ]
            );
        });
    }

    private function resolveInventoryItem(AidDistributionPlan $plan, ?int $inventoryItemId): InventoryItem
    {
        $resolvedId = $inventoryItemId ?? $plan->inventory_item_id;

        if ($resolvedId !== null) {
            $item = InventoryItem::query()->find($resolvedId);
            if ($item === null) {
                throw ValidationException::withMessages([
                    'inventory_item_id' => [__('Inventory item not found.')],
                ]);
            }

            return $item;
        }

        $label = trim((string) ($plan->item_label ?: $plan->title));
        if ($label !== '') {
            $matched = InventoryItem::query()
                ->where('status', InventoryItemStatus::Stored)
                ->where('quantity_remaining', '>', 0)
                ->where(function ($query) use ($label): void {
                    $query->where('name', $label)
                        ->orWhere('name', 'like', '%'.$label.'%');
                })
                ->orderByDesc('quantity_remaining')
                ->first();

            if ($matched !== null) {
                return $matched;
            }
        }

        throw ValidationException::withMessages([
            'inventory_item_id' => [__(
                'Select an inventory item for this in-kind plan (or name the item to match warehouse stock).'
            )],
        ]);
    }

    private function ensureFamilyQrTokens(AidDistributionPlan $plan): void
    {
        $plan->loadMissing('lines.family');
        foreach ($plan->lines as $line) {
            if ($line->family !== null) {
                $this->ensureFamilyQrToken($line->family);
            }
        }
    }

    private function ensureFamilyQrToken(Family $family): void
    {
        if ($family->qr_token !== null) {
            return;
        }

        if ($family->enrollment_status !== FamilyEnrollmentStatus::Approved) {
            return;
        }

        $family->forceFill(['qr_token' => (string) Str::uuid()])->save();
        $family->refresh();
    }

    private function notifyBeneficiariesCashCycle(AidDistributionPlan $plan, int $cycleNumber): void
    {
        $plan->loadMissing('lines.beneficiary.user');
        $itemLabel = trim((string) ($plan->item_label ?: $plan->title));

        foreach ($plan->lines as $line) {
            if ($line->allocated_amount === null) {
                continue;
            }

            $this->notifier->notifyUser(
                $line->beneficiary?->user,
                'تم تنفيذ دورة توزيع نقدي',
                sprintf(
                    'تم تنفيذ الدورة %d لـ «%s» بقيمة %s. راجع محفظتك.',
                    $cycleNumber,
                    $itemLabel,
                    number_format((float) $line->allocated_amount, 2)
                ),
                '/app/beneficiary/wallet',
                [
                    'plan_id' => $plan->id,
                    'completed_cycles' => $cycleNumber,
                    'item_label' => $itemLabel,
                ]
            );
        }
    }
}
