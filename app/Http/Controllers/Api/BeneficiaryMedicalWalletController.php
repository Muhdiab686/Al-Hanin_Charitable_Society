<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMedicalPrescriptionCreditRequest;
use App\Models\Beneficiary;
use App\Models\MedicalPrescriptionCredit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BeneficiaryMedicalWalletController extends Controller
{
    public function show(Request $request, Beneficiary $beneficiary): JsonResponse
    {
        $this->authorizeBeneficiaryView($request, $beneficiary);

        return response()->json([
            'beneficiary' => $beneficiary->load('family'),
            'medical_wallet' => [
                'balance' => $beneficiary->medical_wallet_balance,
                'credits' => $beneficiary->prescriptionCredits()
                    ->with('creditor:id,name,email')
                    ->latest('credited_at')
                    ->paginate(15),
            ],
        ]);
    }

    public function credit(
        StoreMedicalPrescriptionCreditRequest $request,
        Beneficiary $beneficiary
    ): JsonResponse {
        $validated = $request->validated();

        $credit = DB::transaction(function () use ($request, $beneficiary, $validated): MedicalPrescriptionCredit {
            $lockedBeneficiary = Beneficiary::query()
                ->whereKey($beneficiary->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedBeneficiary->medical_wallet_balance = bcadd(
                (string) $lockedBeneficiary->medical_wallet_balance,
                (string) $validated['amount'],
                2
            );
            $lockedBeneficiary->save();

            return MedicalPrescriptionCredit::query()->create([
                'beneficiary_id' => $lockedBeneficiary->id,
                'amount' => $validated['amount'],
                'prescription_reference' => $validated['prescription_reference'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'credited_by' => $request->user()->id,
                'credited_at' => now(),
            ]);
        });

        return response()->json([
            'message' => __('Medical prescription credit added successfully.'),
            'balance' => $beneficiary->fresh()->medical_wallet_balance,
            'credit' => $credit->load('creditor:id,name,email'),
        ], 201);
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
