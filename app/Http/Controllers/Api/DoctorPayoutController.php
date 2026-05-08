<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewDoctorPayoutRequest;
use App\Http\Requests\StoreDoctorPayoutRequest;
use App\Models\ClinicAppointment;
use App\Models\ClinicStaffProfile;
use App\Models\DoctorPayoutRequest;
use Illuminate\Http\JsonResponse;

class DoctorPayoutController extends Controller
{
    public function index(): JsonResponse
    {
        $requests = DoctorPayoutRequest::query()
            ->with(['doctor:id,name,email', 'requester:id,name,email', 'reviewer:id,name,email'])
            ->latest()
            ->paginate(15);

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

        $consultationsCount = ClinicAppointment::query()
            ->where('doctor_id', $doctor->id)
            ->where('status', 'completed')
            ->whereDate('scheduled_at', '>=', $validated['period_start'])
            ->whereDate('scheduled_at', '<=', $validated['period_end'])
            ->count();

        $amount = ((float) $profile->monthly_salary) + ($consultationsCount * (float) $profile->consultation_fee);

        $payout = DoctorPayoutRequest::query()->create([
            'doctor_id' => $doctor->id,
            'period_start' => $validated['period_start'],
            'period_end' => $validated['period_end'],
            'consultations_count' => $consultationsCount,
            'amount' => $amount,
            'status' => 'pending',
            'requested_by' => $doctor->id,
        ]);

        return response()->json([
            'message' => __('Doctor payout request submitted successfully.'),
            'request' => $payout->load(['doctor:id,name,email', 'requester:id,name,email']),
        ], 201);
    }

    public function review(
        ReviewDoctorPayoutRequest $request,
        DoctorPayoutRequest $doctorPayoutRequest
    ): JsonResponse {
        if ($doctorPayoutRequest->status !== 'pending') {
            abort(422, 'Only pending payout requests can be reviewed.');
        }

        $validated = $request->validated();

        $doctorPayoutRequest->forceFill([
            'status' => $validated['decision'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_note' => $validated['review_note'] ?? null,
        ])->save();

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
