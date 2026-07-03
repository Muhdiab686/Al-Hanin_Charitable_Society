<?php

namespace App\Http\Controllers\Api;

use App\Enums\AppointmentWorkflowStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveClinicAppointmentRequest;
use App\Http\Requests\CancelClinicAppointmentRequest;
use App\Http\Requests\ProposeClinicAppointmentRescheduleRequest;
use App\Http\Requests\RequestClinicAppointmentRequest;
use App\Http\Requests\RespondClinicAppointmentRescheduleRequest;
use App\Http\Requests\StoreClinicAppointmentRequest;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use App\Models\ClinicStaffProfile;
use App\Services\AppNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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

        if ($user->role === UserRole::Doctor) {
            $query->where('doctor_id', $user->id);
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

    public function requestAppointment(RequestClinicAppointmentRequest $request, AppNotificationService $notifier): JsonResponse
    {
        $beneficiary = Beneficiary::query()
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $validated = $request->validated();
        $doctorProfile = ClinicStaffProfile::query()
            ->where('user_id', $validated['doctor_id'])
            ->where('is_active', true)
            ->first();
        abort_if($doctorProfile === null, 422, 'The selected doctor is not active in clinic staff.');
        if ($doctorProfile->specialty !== null && $doctorProfile->specialty !== $validated['requested_specialty']) {
            abort(422, 'The selected doctor does not match the requested specialty.');
        }

        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $validated['doctor_id'],
            'created_by' => $request->user()->id,
            'scheduled_at' => $validated['preferred_date'] ?? now()->addDays(3),
            'status' => 'pending',
            'workflow_status' => AppointmentWorkflowStatus::PendingApproval->value,
            'requested_specialty' => $validated['requested_specialty'],
            'reason' => $validated['reason'] ?? null,
        ]);

        $notifier->notifyRoles(
            ['secretary', 'recording_secretary', 'admin'],
            'طلب موعد طبي جديد',
            'تم إرسال طلب موعد طبي جديد ويحتاج المراجعة.',
            '/app/secretary/clinic',
            ['appointment_id' => $appointment->id, 'beneficiary_id' => $beneficiary->id]
        );

        return response()->json([
            'message' => __('Appointment request submitted. The secretariat will review and schedule it.'),
            'appointment' => $appointment->load('beneficiary.family'),
        ], 201);
    }

    public function doctorsCatalog(Request $request): JsonResponse
    {
        $query = ClinicStaffProfile::query()
            ->with('user:id,name,email,role')
            ->where('is_active', true)
            ->whereHas('user', fn ($userQuery) => $userQuery->where('role', UserRole::Doctor->value))
            ->orderBy('specialty')
            ->orderBy('id');

        if ($request->filled('specialty')) {
            $query->where('specialty', (string) $request->string('specialty'));
        }

        return response()->json([
            'doctors' => $query->get(),
        ]);
    }

    public function approve(
        ApproveClinicAppointmentRequest $request,
        ClinicAppointment $appointment,
        AppNotificationService $notifier
    ): JsonResponse {
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

        $beneficiaryUser = $appointment->beneficiary?->user;
        $notifier->notifyUser(
            $beneficiaryUser,
            'تمت الموافقة على الموعد الطبي',
            'تمت جدولة موعدك الطبي بنجاح.',
            '/app/beneficiary/appointments',
            ['appointment_id' => $appointment->id]
        );

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

    public function proposeReschedule(
        ProposeClinicAppointmentRescheduleRequest $request,
        ClinicAppointment $appointment,
        AppNotificationService $notifier
    ): JsonResponse {
        abort_unless(
            in_array($appointment->workflow_status, [
                AppointmentWorkflowStatus::PendingApproval->value,
                AppointmentWorkflowStatus::Scheduled->value,
            ], true),
            422,
            __('Only pending or scheduled appointments can be rescheduled.'),
        );

        $validated = $request->validated();

        $appointment->forceFill([
            'doctor_id' => $validated['doctor_id'],
            'proposed_scheduled_at' => $validated['scheduled_at'],
            'proposal_note' => $validated['proposal_note'] ?? null,
            'status' => 'pending',
            'workflow_status' => AppointmentWorkflowStatus::RescheduleProposed->value,
            'proposed_by' => $request->user()->id,
            'proposal_responded_at' => null,
        ])->save();

        $notifier->notifyUser(
            $appointment->beneficiary?->user,
            'اقتراح تعديل موعد طبي',
            'تم إرسال وقت بديل لموعدك الطبي، يرجى قبول أو رفض التعديل.',
            '/app/beneficiary/appointments',
            ['appointment_id' => $appointment->id]
        );

        return response()->json([
            'message' => __('Reschedule proposal sent to beneficiary.'),
            'appointment' => $appointment->fresh()->load(['beneficiary.family', 'doctor:id,name,email']),
        ]);
    }

    public function respondReschedule(
        RespondClinicAppointmentRescheduleRequest $request,
        ClinicAppointment $appointment,
        AppNotificationService $notifier
    ): JsonResponse {
        $beneficiary = Beneficiary::query()->where('user_id', $request->user()->id)->firstOrFail();

        if ((int) $appointment->beneficiary_id !== (int) $beneficiary->id) {
            abort(403);
        }

        if ($appointment->workflow_status !== AppointmentWorkflowStatus::RescheduleProposed->value) {
            throw ValidationException::withMessages([
                'appointment' => [__('There is no pending reschedule proposal for this appointment.')],
            ]);
        }

        $decision = $request->validated('decision');
        if ($decision === 'accepted') {
            $appointment->forceFill([
                'scheduled_at' => $appointment->proposed_scheduled_at,
                'status' => 'scheduled',
                'workflow_status' => AppointmentWorkflowStatus::Scheduled->value,
                'approved_by' => $appointment->proposed_by,
                'approved_at' => now(),
                'proposal_responded_at' => now(),
                'proposed_scheduled_at' => null,
                'proposal_note' => null,
            ])->save();
        } else {
            $appointment->forceFill([
                'status' => 'pending',
                'workflow_status' => AppointmentWorkflowStatus::PendingApproval->value,
                'proposal_responded_at' => now(),
                'proposed_scheduled_at' => null,
                'proposal_note' => null,
            ])->save();
        }

        $notifier->notifyRoles(
            ['secretary', 'recording_secretary', 'admin'],
            'رد على اقتراح تعديل الموعد',
            $decision === 'accepted'
                ? 'قام المستفيد بقبول الوقت البديل للموعد.'
                : 'قام المستفيد برفض الوقت البديل للموعد.',
            '/app/secretary/clinic',
            ['appointment_id' => $appointment->id]
        );

        return response()->json([
            'message' => $decision === 'accepted'
                ? __('Appointment reschedule accepted.')
                : __('Appointment reschedule rejected.'),
            'appointment' => $appointment->fresh()->load(['beneficiary.family', 'doctor:id,name,email']),
        ]);
    }
}
