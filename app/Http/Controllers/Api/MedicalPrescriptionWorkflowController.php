<?php

namespace App\Http\Controllers\Api;

use App\Enums\WalletEntryCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\DisburseMedicalPrescriptionRequest;
use App\Http\Requests\ReviewMedicalPrescriptionRequest;
use App\Models\Beneficiary;
use App\Models\FinancialTransaction;
use App\Models\MedicalPrescriptionCredit;
use App\Models\MedicalRecord;
use App\Services\AppNotificationService;
use App\Services\WalletLedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MedicalPrescriptionWorkflowController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MedicalRecord::query()
            ->with([
                'beneficiary.family',
                'doctor:id,name,email',
                'appointment:id,scheduled_at',
                'prescriptionReviewer:id,name,email',
                'prescriptionDisburser:id,name,email',
            ])
            ->whereNotNull('prescription')
            ->whereNotNull('prescription_cost')
            ->where('prescription_cost', '>', 0)
            ->latest('recorded_at');

        if ($request->filled('workflow_status')) {
            $query->where('prescription_workflow_status', (string) $request->string('workflow_status'));
        }

        if ($request->filled('beneficiary_id')) {
            $query->where('beneficiary_id', (int) $request->integer('beneficiary_id'));
        }

        return response()->json($query->paginate(15));
    }

    public function review(
        ReviewMedicalPrescriptionRequest $request,
        MedicalRecord $medicalRecord,
        AppNotificationService $notifier
    ): JsonResponse {
        if ($medicalRecord->prescription_workflow_status !== 'pending_secretary_review') {
            throw ValidationException::withMessages([
                'medical_record' => [__('Only pending prescription requests can be reviewed.')],
            ]);
        }

        $decision = $request->validated('decision');
        $workflowStatus = $decision === 'approved' ? 'approved_by_secretary' : 'rejected_by_secretary';

        $medicalRecord->forceFill([
            'prescription_workflow_status' => $workflowStatus,
            'prescription_reviewed_by' => $request->user()->id,
            'prescription_reviewed_at' => now(),
            'prescription_review_note' => $request->validated('review_note'),
        ])->save();

        $notifier->notifyUser(
            $medicalRecord->beneficiary?->user,
            'تحديث قرار الوصفة الطبية',
            $workflowStatus === 'approved_by_secretary'
                ? 'تمت الموافقة على صرف الوصفة الطبية.'
                : 'تم رفض طلب صرف الوصفة الطبية.',
            '/app/beneficiary/medical',
            ['medical_record_id' => $medicalRecord->id, 'workflow_status' => $workflowStatus]
        );

        if ($workflowStatus === 'approved_by_secretary') {
            $notifier->notifyRoles(
                ['accountant', 'admin'],
                'وصفة بانتظار الصرف',
                'توجد وصفة طبية معتمدة بانتظار الصرف المالي.',
                '/app/accountant/expenses',
                ['medical_record_id' => $medicalRecord->id]
            );
        }

        return response()->json([
            'message' => __('Prescription request reviewed successfully.'),
            'record' => $medicalRecord->fresh()->load([
                'beneficiary.family',
                'doctor:id,name,email',
                'appointment:id,scheduled_at',
                'prescriptionReviewer:id,name,email',
                'prescriptionDisburser:id,name,email',
            ]),
        ]);
    }

    public function disburse(
        DisburseMedicalPrescriptionRequest $request,
        MedicalRecord $medicalRecord,
        AppNotificationService $notifier,
        WalletLedgerService $walletLedger
    ): JsonResponse {
        $updatedRecord = DB::transaction(function () use ($request, $medicalRecord, $walletLedger): MedicalRecord {
            $lockedRecord = MedicalRecord::query()
                ->whereKey($medicalRecord->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRecord->prescription_workflow_status !== 'approved_by_secretary') {
                throw ValidationException::withMessages([
                    'medical_record' => [__('Prescription disbursement requires secretary approval first.')],
                ]);
            }

            $amount = (float) $lockedRecord->prescription_cost;
            if ($amount <= 0) {
                throw ValidationException::withMessages([
                    'medical_record' => [__('Prescription cost must be greater than zero.')],
                ]);
            }

            /** @var Beneficiary $beneficiary */
            $beneficiary = Beneficiary::query()
                ->whereKey($lockedRecord->beneficiary_id)
                ->firstOrFail();

            $credit = MedicalPrescriptionCredit::query()->create([
                'beneficiary_id' => $beneficiary->id,
                'amount' => $lockedRecord->prescription_cost,
                'prescription_reference' => 'MEDREC-'.$lockedRecord->id,
                'notes' => $request->validated('notes') ?: 'Prescription disbursement',
                'credited_by' => $request->user()->id,
                'credited_at' => now(),
            ]);

            $transaction = FinancialTransaction::query()->create([
                'type' => 'expense',
                'source' => 'prescription_wallet_disbursement',
                'amount' => $lockedRecord->prescription_cost,
                'reference_type' => MedicalRecord::class,
                'reference_id' => $lockedRecord->id,
                'description' => 'Prescription disbursement for medical record #'.$lockedRecord->id,
                'recorded_by' => $request->user()->id,
                'recorded_at' => now(),
            ]);

            $walletLedger->creditBeneficiaryCash(
                $beneficiary,
                $amount,
                WalletEntryCategory::PrescriptionCredit,
                $credit,
                __('Prescription disbursement for medical record #:id.', ['id' => $lockedRecord->id]),
                $request->user(),
                $transaction,
            );

            $lockedRecord->forceFill([
                'prescription_workflow_status' => 'disbursed',
                'prescription_disbursed_by' => $request->user()->id,
                'prescription_disbursed_at' => now(),
                'prescription_disbursement_transaction_id' => $transaction->id,
            ])->save();

            return $lockedRecord;
        });

        $notifier->notifyUser(
            $updatedRecord->beneficiary?->user,
            'تم صرف الوصفة الطبية',
            'تم تحويل قيمة الوصفة إلى محفظتك.',
            '/app/beneficiary/wallet',
            ['medical_record_id' => $updatedRecord->id]
        );

        return response()->json([
            'message' => __('Prescription disbursement completed successfully.'),
            'record' => $updatedRecord->fresh()->load([
                'beneficiary.family',
                'doctor:id,name,email',
                'appointment:id,scheduled_at',
                'prescriptionReviewer:id,name,email',
                'prescriptionDisburser:id,name,email',
            ]),
        ]);
    }
}
