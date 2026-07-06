<?php

namespace App\Http\Controllers\Api;

use App\Enums\WalletEntryCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMedicalPrescriptionCreditRequest;
use App\Models\AidDistributionPlanLine;
use App\Models\AidInventoryAllocation;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\FinancialTransaction;
use App\Models\MedicalPrescriptionCredit;
use App\Models\User;
use App\Models\WalletEntry;
use App\Services\WalletLedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BeneficiaryMedicalWalletController extends Controller
{
    public function show(Request $request, Beneficiary $beneficiary, WalletLedgerService $ledger): JsonResponse
    {
        $this->authorizeBeneficiaryView($request, $beneficiary);

        $wallet = $ledger->beneficiaryWalletPayload($beneficiary);

        return response()->json([
            'beneficiary' => $beneficiary->load('family'),
            'wallet' => $wallet,
            'medical_wallet' => [
                'balance' => $wallet['balance'],
                'entries' => $wallet['entries'],
            ],
        ]);
    }

    public function showSelf(Request $request, WalletLedgerService $ledger): JsonResponse
    {
        $beneficiary = Beneficiary::query()
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        return $this->show($request, $beneficiary, $ledger);
    }

    public function credit(
        StoreMedicalPrescriptionCreditRequest $request,
        Beneficiary $beneficiary,
        WalletLedgerService $ledger
    ): JsonResponse {
        $validated = $request->validated();

        $credit = DB::transaction(function () use ($request, $beneficiary, $validated, $ledger): MedicalPrescriptionCredit {
            $credit = MedicalPrescriptionCredit::query()->create([
                'beneficiary_id' => $beneficiary->id,
                'amount' => $validated['amount'],
                'prescription_reference' => $validated['prescription_reference'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'credited_by' => $request->user()->id,
                'credited_at' => now(),
            ]);

            $ledger->creditBeneficiaryCash(
                $beneficiary,
                (float) $validated['amount'],
                WalletEntryCategory::PrescriptionCredit,
                $credit,
                $validated['notes'] ?? __('Medical prescription credit.'),
                $request->user(),
            );

            return $credit;
        });

        return response()->json([
            'message' => __('Medical prescription credit added successfully.'),
            'balance' => $beneficiary->fresh()->medical_wallet_balance,
            'credit' => $credit->load('creditor:id,name,email'),
        ], 201);
    }

    public static function creditCashAidRequestIfNeeded(AidRequest $aidRequest, ?Request $request): void
    {
        if ($aidRequest->status !== 'fulfilled' || $aidRequest->type !== 'urgent_financial') {
            return;
        }

        $amount = (float) ($aidRequest->requested_amount ?? 0);
        if ($amount <= 0) {
            return;
        }

        $beneficiary = $aidRequest->beneficiary;
        if ($beneficiary === null) {
            return;
        }

        $alreadyCredited = WalletEntry::query()
            ->where('owner_type', 'beneficiary')
            ->where('owner_id', $beneficiary->id)
            ->where('reference_type', AidRequest::class)
            ->where('reference_id', $aidRequest->id)
            ->where('category', WalletEntryCategory::CashAid->value)
            ->exists();

        if ($alreadyCredited) {
            return;
        }

        $ledger = app(WalletLedgerService::class);

        DB::transaction(function () use ($ledger, $beneficiary, $amount, $aidRequest, $request): void {
            $transaction = FinancialTransaction::query()->create([
                'type' => 'expense',
                'source' => 'beneficiary_cash_aid',
                'amount' => $amount,
                'reference_type' => AidRequest::class,
                'reference_id' => $aidRequest->id,
                'description' => 'صرف مساعدة نقدية — طلب #'.$aidRequest->id,
                'recorded_by' => $request?->user()?->id,
                'recorded_at' => now(),
            ]);

            $ledger->creditBeneficiaryCash(
                $beneficiary,
                $amount,
                WalletEntryCategory::CashAid,
                $aidRequest,
                __('Cash aid disbursed for request #:id.', ['id' => $aidRequest->id]),
                $request?->user(),
                $transaction,
            );
        });
    }

    public static function recordMaterialAllocationDelivery(
        AidInventoryAllocation $allocation,
        ?Request $request,
    ): void {
        $aidRequest = $allocation->aidRequest;
        $beneficiary = $aidRequest?->beneficiary;

        if ($beneficiary === null) {
            return;
        }

        $alreadyRecorded = WalletEntry::query()
            ->where('owner_type', 'beneficiary')
            ->where('owner_id', $beneficiary->id)
            ->where('reference_type', AidInventoryAllocation::class)
            ->where('reference_id', $allocation->id)
            ->exists();

        if ($alreadyRecorded) {
            return;
        }

        $itemName = $allocation->inventoryItem?->name ?? __('Aid item');
        $quantity = (int) ($allocation->quantity ?? 1);

        app(WalletLedgerService::class)->recordBeneficiaryMaterialAid(
            $beneficiary,
            max(1, $quantity),
            $itemName,
            $allocation,
            __('Material aid delivered: :item (x:qty).', ['item' => $itemName, 'qty' => $quantity]),
            $request?->user(),
        );
    }

    public static function creditDistributionPlanCycle(
        AidDistributionPlanLine $line,
        int $cycleNumber,
        ?int $recordedBy,
    ): void {
        $beneficiary = $line->beneficiary;
        if ($beneficiary === null) {
            return;
        }

        $cycleMarker = 'دورة '.$cycleNumber;

        $alreadyCredited = WalletEntry::query()
            ->where('owner_type', 'beneficiary')
            ->where('owner_id', $beneficiary->id)
            ->where('reference_type', AidDistributionPlanLine::class)
            ->where('reference_id', $line->id)
            ->where('description', 'like', '%'.$cycleMarker.'%')
            ->exists();

        if ($alreadyCredited) {
            return;
        }

        $ledger = app(WalletLedgerService::class);
        $recordedByUser = $recordedBy ? User::query()->find($recordedBy) : null;

        if ((float) ($line->allocated_amount ?? 0) > 0) {
            DB::transaction(function () use ($ledger, $beneficiary, $line, $cycleNumber, $cycleMarker, $recordedByUser): void {
                $amount = (float) $line->allocated_amount;

                $transaction = FinancialTransaction::query()->create([
                    'type' => 'expense',
                    'source' => 'beneficiary_cash_aid',
                    'amount' => $amount,
                    'reference_type' => AidDistributionPlanLine::class,
                    'reference_id' => $line->id,
                    'description' => 'صرف مساعدة نقدية — '.$cycleMarker.' — خطة #'.$line->aid_distribution_plan_id,
                    'recorded_by' => $recordedByUser?->id,
                    'recorded_at' => now(),
                ]);

                $ledger->creditBeneficiaryCash(
                    $beneficiary,
                    $amount,
                    WalletEntryCategory::CashAid,
                    $line,
                    __('Cash aid from distribution plan cycle :cycle.', ['cycle' => $cycleNumber]).' ('.$cycleMarker.')',
                    $recordedByUser,
                    $transaction,
                );
            });

            return;
        }

        if ((int) ($line->allocated_units ?? 0) > 0) {
            $ledger->recordBeneficiaryMaterialAid(
                $beneficiary,
                (int) $line->allocated_units,
                __('Aid units'),
                $line,
                __('Material aid from distribution plan cycle :cycle.', ['cycle' => $cycleNumber]).' ('.$cycleMarker.')',
                $recordedByUser,
            );
        }
    }

    private function authorizeBeneficiaryView(Request $request, Beneficiary $beneficiary): void
    {
        $user = $request->user();
        abort_if($user === null, 403);

        if ($user->hasRole('beneficiary') && $beneficiary->user_id !== $user->id) {
            abort(403);
        }
    }
}
