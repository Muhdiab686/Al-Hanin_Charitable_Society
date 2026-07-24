<?php

namespace App\Http\Controllers\Api\Beneficiary;

use App\Enums\FamilyEnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Models\AidDistributionPlanLine;
use App\Models\AidInventoryAllocation;
use App\Models\Beneficiary;
use App\Models\MedicalPrescriptionCredit;
use App\Services\FamilyQrCodeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BeneficiaryAidWalletController extends Controller
{
    public function show(Request $request, FamilyQrCodeGenerator $qrGenerator): JsonResponse
    {
        $beneficiary = Beneficiary::query()
            ->where('user_id', $request->user()->id)
            ->with('family')
            ->firstOrFail();

        $planLines = AidDistributionPlanLine::query()
            ->with(['plan:id,title,aid_type,item_label,completed_cycles,distribution_date,status'])
            ->where('beneficiary_id', $beneficiary->id)
            ->latest('id')
            ->get();

        $allocations = AidInventoryAllocation::query()
            ->with([
                'inventoryItem:id,name,item_code',
                'aidRequest:id,beneficiary_id,type,description',
            ])
            ->whereHas('aidRequest', fn ($q) => $q->where('beneficiary_id', $beneficiary->id))
            ->latest('id')
            ->get();

        $medicalCredits = MedicalPrescriptionCredit::query()
            ->where('beneficiary_id', $beneficiary->id)
            ->latest('id')
            ->get();

        $entries = [];

        foreach ($planLines as $line) {
            $plan = $line->plan;
            $itemLabel = trim((string) ($plan?->item_label ?: $plan?->title ?: 'مساعدة'));
            $cycle = max(1, (int) ($plan?->completed_cycles ?: 1));
            $isCash = $line->allocated_amount !== null;
            $fulfilled = (int) $line->last_fulfilled_cycle > 0;

            $entries[] = [
                'id' => 'plan-'.$line->id,
                'source' => 'distribution_plan',
                'occurred_at' => $plan?->distribution_date?->toDateString() ?? $line->created_at?->toIso8601String(),
                'type' => $isCash ? 'cash' : 'in_kind',
                'type_label' => $isCash
                    ? 'مساعدة نقدية'
                    : ($fulfilled ? 'مساعدة عينية (جاهزة للاستلام)' : 'مساعدة عينية (بانتظار التنفيذ)'),
                'item_label' => $itemLabel,
                'value' => $isCash
                    ? number_format((float) $line->allocated_amount, 2, '.', '')
                    : (string) ((int) $line->allocated_units),
                'value_label' => $isCash
                    ? '$ '.number_format((float) $line->allocated_amount, 2)
                    : ((int) $line->allocated_units).' × '.$itemLabel,
                'description' => $isCash
                    ? sprintf('%s — من خطة «%s» (دورة %d)', $itemLabel, (string) ($plan?->title ?? ''), $cycle)
                    : sprintf('%s — كمية %d من خطة «%s» (دورة %d)', $itemLabel, (int) $line->allocated_units, (string) ($plan?->title ?? ''), $cycle),
                'aid_request_id' => $line->last_aid_request_id,
            ];
        }

        foreach ($allocations as $allocation) {
            $itemName = trim((string) ($allocation->inventoryItem?->name ?: $allocation->inventoryItem?->item_code ?: 'مادة'));
            $qty = (int) $allocation->quantity;
            $delivered = $allocation->delivered_at !== null;

            $entries[] = [
                'id' => 'alloc-'.$allocation->id,
                'source' => 'inventory_allocation',
                'occurred_at' => ($allocation->delivered_at ?? $allocation->created_at)?->toIso8601String(),
                'type' => 'in_kind',
                'type_label' => $delivered ? 'مساعدة عينية (تم التسليم)' : 'مساعدة عينية (قيد التسليم)',
                'item_label' => $itemName,
                'value' => (string) $qty,
                'value_label' => $qty.' × '.$itemName,
                'description' => $delivered
                    ? sprintf('تم تسليم %s (كمية %d)', $itemName, $qty)
                    : sprintf('تم تخصيص %s لك (كمية %d) — بانتظار تأكيد الاستلام عبر رمز العائلة', $itemName, $qty),
                'aid_request_id' => $allocation->aid_request_id,
            ];
        }

        foreach ($medicalCredits as $credit) {
            $entries[] = [
                'id' => 'med-'.$credit->id,
                'source' => 'medical_wallet',
                'occurred_at' => $credit->created_at?->toIso8601String(),
                'type' => 'medical',
                'type_label' => 'محفظة طبية',
                'item_label' => 'رصيد وصفة / علاج',
                'value' => number_format((float) $credit->amount, 2, '.', ''),
                'value_label' => '$ '.number_format((float) $credit->amount, 2),
                'description' => trim((string) ($credit->notes ?: 'إيداع في المحفظة الطبية')),
                'aid_request_id' => null,
            ];
        }

        usort($entries, function (array $a, array $b): int {
            return strcmp((string) ($b['occurred_at'] ?? ''), (string) ($a['occurred_at'] ?? ''));
        });

        $cashBalance = (float) $planLines->sum(fn (AidDistributionPlanLine $line): float => (float) ($line->allocated_amount ?? 0));
        $cashBalance += (float) $beneficiary->medical_wallet_balance;

        $pendingDeliveries = $allocations->filter(fn (AidInventoryAllocation $a): bool => $a->delivered_at === null)->count();

        return response()->json([
            'cash_balance' => number_format($cashBalance, 2, '.', ''),
            'medical_wallet_balance' => number_format((float) $beneficiary->medical_wallet_balance, 2, '.', ''),
            'pending_deliveries_count' => $pendingDeliveries,
            'receipt_qr' => $this->receiptQrPayload($beneficiary, $qrGenerator),
            'entries' => $entries,
        ]);
    }

    /**
     * @return array{payload: string, png_base64: string, mime_type: string}|null
     */
    private function receiptQrPayload(Beneficiary $beneficiary, FamilyQrCodeGenerator $qrGenerator): ?array
    {
        $family = $beneficiary->family;
        if ($family === null) {
            return null;
        }

        if ($family->enrollment_status !== FamilyEnrollmentStatus::Approved) {
            return null;
        }

        if ($family->qr_token === null) {
            $family->forceFill(['qr_token' => (string) Str::uuid()])->save();
            $family->refresh();
        }

        $payload = $qrGenerator->formatPayload((string) $family->qr_token);
        $image = $qrGenerator->toBase64Image($payload);

        return [
            'payload' => $payload,
            'png_base64' => $image['base64'],
            'mime_type' => $image['mime_type'],
        ];
    }
}
