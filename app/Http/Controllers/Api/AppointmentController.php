<?php

namespace App\Http\Controllers\Api;

use App\Enums\AppointmentWorkflowStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveClinicAppointmentRequest;
use App\Http\Requests\CancelClinicAppointmentRequest;
use App\Http\Requests\RequestClinicAppointmentRequest;
use App\Http\Requests\StoreClinicAppointmentRequest;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ClinicAppointment::query()
            ->with(['beneficiary.family', 'doctor:id,name,email', 'doctor.clinicStaffProfile:user_id,specialty,bio'])
            ->latest('scheduled_at');

        $user = $request->user();

        if ($user->role === UserRole::Beneficiary) {
            $beneficiaryId = Beneficiary::query()->where('user_id', $user->id)->value('id');
            if ($beneficiaryId) {
                $query->where('beneficiary_id', $beneficiaryId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->filled('from')) {
            $query->whereDate('scheduled_at', '>=', (string) $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('scheduled_at', '<=', (string) $request->string('to'));
        }

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('workflow_status')) {
            $query->where('workflow_status', (string) $request->string('workflow_status'));
        }

        if ($request->filled('beneficiary_id') && $user->role !== UserRole::Beneficiary) {
            $query->where('beneficiary_id', (int) $request->integer('beneficiary_id'));
        }

        return response()->json($query->paginate(15));
    }

    public function store(StoreClinicAppointmentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $validated['beneficiary_id'],
            'doctor_id' => $validated['doctor_id'],
            'created_by' => $request->user()->id,
            'scheduled_at' => $validated['scheduled_at'],
            'status' => 'scheduled',
            'workflow_status' => AppointmentWorkflowStatus::Scheduled->value,
            'reason' => $validated['reason'] ?? null,
            'requested_specialty' => $validated['requested_specialty'] ?? null,
        ]);

        return response()->json([
            'message' => __('Appointment created successfully.'),
            'appointment' => $appointment->load(['beneficiary.family', 'doctor:id,name,email']),
        ], 201);
    }

    public function requestAppointment(RequestClinicAppointmentRequest $request): JsonResponse
    {
        $beneficiary = Beneficiary::query()
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $validated = $request->validated();

        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => null,
            'created_by' => $request->user()->id,
            'scheduled_at' => $validated['preferred_date'] ?? now()->addDays(3),
            'status' => 'pending',
            'workflow_status' => AppointmentWorkflowStatus::PendingApproval->value,
            'requested_specialty' => $validated['requested_specialty'],
            'reason' => $validated['reason'] ?? null,
        ]);

        return response()->json([
            'message' => __('Appointment request submitted. The secretariat will review and schedule it.'),
            'appointment' => $appointment->load('beneficiary.family'),
        ], 201);
    }

    public function approve(ApproveClinicAppointmentRequest $request, ClinicAppointment $appointment): JsonResponse
    {
        abort_unless(
            $appointment->workflow_status === AppointmentWorkflowStatus::PendingApproval->value,
            422,
            __('Only pending appointment requests can be approved.'),
        );

        $validated = $request->validated();

        $appointment->forceFill([
            'doctor_id' => $validated['doctor_id'],
            'scheduled_at' => $validated['scheduled_at'],
            'status' => 'scheduled',
            'workflow_status' => AppointmentWorkflowStatus::Scheduled->value,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ])->save();

        return response()->json([
            'message' => __('Appointment approved and scheduled successfully.'),
            'appointment' => $appointment->fresh()->load(['beneficiary.family', 'doctor:id,name,email']),
        ]);
    }

    public function cancel(CancelClinicAppointmentRequest $request, ClinicAppointment $appointment): JsonResponse
    {
        if ($appointment->status === 'cancelled') {
            return response()->json([
                'message' => __('Appointment already cancelled.'),
                'appointment' => $appointment->load(['beneficiary.family', 'doctor:id,name,email']),
            ]);
        }

        $appointment->forceFill([
            'status' => 'cancelled',
            'workflow_status' => AppointmentWorkflowStatus::Cancelled->value,
            'cancelled_at' => now(),
            'cancellation_reason' => $request->validated('cancellation_reason'),
        ])->save();

        return response()->json([
            'message' => __('Appointment cancelled successfully.'),
            'appointment' => $appointment->fresh()->load(['beneficiary.family', 'doctor:id,name,email']),
        ]);
    }
}
