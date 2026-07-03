<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewDoctorPayoutRequest;
use App\Http\Requests\StoreDoctorPayoutRequest;
use App\Models\ClinicAppointment;
use App\Models\ClinicStaffProfile;
use App\Models\DoctorPayoutRequest;
use App\Models\FinancialTransaction;
use App\Services\AppNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DoctorPayoutController extends Controller
{
    public function index(): JsonResponse
    {
        $query = DoctorPayoutRequest::query()
            ->with(['doctor:id,name,email', 'requester:id,name,email', 'reviewer:id,name,email'])
            ->latest();

        if (request()->user()?->hasRole('doctor')) {
            $query->where('doctor_id', request()->user()->id);
        }

        $status = request()->string('status')->toString();
        if ($status !== '') {
            $query->where('status', $status);
        } elseif (request()->user()?->hasRole('accountant')) {
            $query->where('status', 'pending');
        }

        $requests = $query->paginate(15);

        return response()->json($requests);
    }

    public function store(StoreDoctorPayoutRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $doctor = $request->user();

        if (! $doctor->hasRole('doctor')) {
            abort(403);
        }

        $profile = ClinicStaffProfile::query()->where('user_id', $doctor->id)->first();
        abort_if($profile === null, 422, 'Doctor clinic profile is missing.');

        $duplicateRequestExists = DoctorPayoutRequest::query()
            ->where('doctor_id', $doctor->id)
            ->whereDate('period_start', $validated['period_start'])
            ->whereDate('period_end', $validated['period_end'])
            ->exists();
        abort_if($duplicateRequestExists, 422, 'A payout request for this period already exists.');

        $payout = DB::transaction(function () use ($validated, $doctor, $profile): DoctorPayoutRequest {
            $eligibleAppointments = ClinicAppointment::query()
                ->where('doctor_id', $doctor->id)
                ->where('status', 'completed')
                ->whereDate('scheduled_at', '>=', $validated['period_start'])
                ->whereDate('scheduled_at', '<=', $validated['period_end'])
                ->where(function ($query): void {
                    $query->whereNull('doctor_payout_request_id')
                        ->where(function ($statusQuery): void {
                            $statusQuery->whereNull('payout_status')
                                ->orWhere('payout_status', 'completed');
                        });
                })
                ->lockForUpdate()
                ->get(['id']);

            $consultationsCount = $eligibleAppointments->count();
            $baseSalaryAmount = (float) $profile->monthly_salary;
            $consultationFeeAmount = (float) $profile->consultation_fee;
            $consultationsAmount = $consultationsCount * $consultationFeeAmount;
            $amount = $baseSalaryAmount + $consultationsAmount;

            $payout = DoctorPayoutRequest::query()->create([
                'doctor_id' => $doctor->id,
                'period_start' => $validated['period_start'],
                'period_end' => $validated['period_end'],
                'consultations_count' => $consultationsCount,
                'base_salary_amount' => $baseSalaryAmount,
                'consultation_fee_amount' => $consultationFeeAmount,
                'consultations_amount' => $consultationsAmount,
                'amount' => $amount,
                'status' => 'pending',
                'requested_by' => $doctor->id,
            ]);

            if ($consultationsCount > 0) {
                ClinicAppointment::query()
                    ->whereIn('id', $eligibleAppointments->pluck('id'))
                    ->update([
                        'payout_status' => 'pending_payment',
                        'doctor_payout_request_id' => $payout->id,
                    ]);
            }

            return $payout;
        });

        return response()->json([
            'message' => __('Doctor payout request submitted successfully.'),
            'request' => $payout->load(['doctor:id,name,email', 'requester:id,name,email']),
        ], 201);
    }

    public function review(
        ReviewDoctorPayoutRequest $request,
        DoctorPayoutRequest $doctorPayoutRequest,
        AppNotificationService $notifier
    ): JsonResponse {
        if ($doctorPayoutRequest->status !== 'pending') {
            abort(422, 'Only pending payout requests can be reviewed.');
        }

        $validated = $request->validated();

        DB::transaction(function () use ($request, $doctorPayoutRequest, $validated): void {
            $doctorPayoutRequest->forceFill([
                'status' => $validated['decision'],
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_note' => $validated['review_note'] ?? null,
            ])->save();

            if ($validated['decision'] === 'approved') {
                FinancialTransaction::query()->create([
                    'type' => 'expense',
                    'source' => 'doctor_payout',
                    'amount' => $doctorPayoutRequest->amount,
                    'reference_type' => DoctorPayoutRequest::class,
                    'reference_id' => $doctorPayoutRequest->id,
                    'description' => 'Doctor payout #'.$doctorPayoutRequest->id,
                    'recorded_by' => $request->user()->id,
                    'recorded_at' => now(),
                ]);

                ClinicAppointment::query()
                    ->where('doctor_payout_request_id', $doctorPayoutRequest->id)
                    ->where('payout_status', 'pending_payment')
                    ->update(['payout_status' => 'paid']);
            } else {
                ClinicAppointment::query()
                    ->where('doctor_payout_request_id', $doctorPayoutRequest->id)
                    ->where('payout_status', 'pending_payment')
                    ->update([
                        'payout_status' => 'completed',
                        'doctor_payout_request_id' => null,
                    ]);
            }
        });

        $notifier->notifyUser(
            $doctorPayoutRequest->doctor,
            'تحديث طلب مستحقات الطبيب',
            $doctorPayoutRequest->status === 'approved'
                ? 'تمت الموافقة على طلب مستحقاتك.'
                : 'تم رفض طلب مستحقاتك.',
            '/app/doctor/payouts',
            ['doctor_payout_request_id' => $doctorPayoutRequest->id, 'status' => $doctorPayoutRequest->status]
        );

        return response()->json([
            'message' => __('Doctor payout request reviewed successfully.'),
            'request' => $doctorPayoutRequest->fresh()->load([
                'doctor:id,name,email',
                'requester:id,name,email',
                'reviewer:id,name,email',
            ]),
        ]);
    }
}
