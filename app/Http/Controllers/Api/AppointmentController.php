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
use App\Services\DoctorAppointmentAvailabilityService;
use Carbon\Carbon;
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
        $role = $user->role instanceof UserRole
            ? $user->role
            : UserRole::tryFrom((string) $user->getRawOriginal('role'));

        $canManageClinic = $user->can('appointments.manage');

        if ($canManageClinic) {
            // السكرتير / أمين السر / الإدارة: كل المواعيد مع فلاتر اختيارية أدناه
        } elseif ($role === UserRole::Doctor || $user->hasRole(UserRole::Doctor->value)) {
            $query->where('doctor_id', $user->id);
        } else {
            // المستفيد (وأي دور بلا صلاحية إدارة العيادة): مواعيده فقط
            $beneficiaryId = Beneficiary::query()->where('user_id', $user->id)->value('id');
            $query->where('beneficiary_id', $beneficiaryId ?? 0);
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

        if ($request->filled('beneficiary_id') && $canManageClinic) {
            $query->where('beneficiary_id', (int) $request->integer('beneficiary_id'));
        }

        if ($request->filled('doctor_id') && $canManageClinic) {
            $query->where('doctor_id', (int) $request->integer('doctor_id'));
        }

        return response()->json($query->paginate(15));
    }

<<<<<<< HEAD
    public function store(StoreClinicAppointmentRequest $request, DoctorAppointmentAvailabilityService $availability): JsonResponse
=======
    public function show(Request $request, ClinicAppointment $appointment): JsonResponse
    {
        $user = $request->user();
        $canManageClinic = $user->can('appointments.manage');
        $role = $user->role instanceof UserRole
            ? $user->role
            : UserRole::tryFrom((string) $user->getRawOriginal('role'));

        if (! $canManageClinic) {
            if ($role === UserRole::Doctor || $user->hasRole(UserRole::Doctor->value)) {
                abort_unless((int) $appointment->doctor_id === (int) $user->id, 403);
            } else {
                $beneficiaryId = Beneficiary::query()->where('user_id', $user->id)->value('id');
                abort_unless((int) $appointment->beneficiary_id === (int) ($beneficiaryId ?? 0), 403);
            }
        }

        return response()->json([
            'appointment' => $appointment->load([
                'beneficiary.family',
                'doctor:id,name,email',
                'doctor.clinicStaffProfile:user_id,specialty,bio',
            ]),
        ]);
    }

    public function store(StoreClinicAppointmentRequest $request): JsonResponse
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
    {
        $validated = $request->validated();

        $scheduledAt = Carbon::parse($validated['scheduled_at']);
        $availability->assertNoDoctorConflict((int) $validated['doctor_id'], $scheduledAt);

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

    public function requestAppointment(
        RequestClinicAppointmentRequest $request,
        AppNotificationService $notifier
    ): JsonResponse {
        $beneficiary = Beneficiary::query()
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $validated = $request->validated();
        $scheduledAt = Carbon::parse($validated['preferred_date'].' '.$validated['preferred_time']);

        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $validated['doctor_id'],
            'created_by' => $request->user()->id,
            'scheduled_at' => $scheduledAt,
            'status' => 'pending',
            'workflow_status' => AppointmentWorkflowStatus::PendingApproval->value,
            'requested_specialty' => $validated['requested_specialty'],
            'reason' => $validated['reason'] ?? null,
        ]);

        $notifier->notifyRoles(
            ['secretary', 'recording_secretary', 'admin'],
            'طلب موعد طبي جديد',
            'تم إرسال طلب موعد طبي جديد ويحتاج المراجعة.',
            '/app/secretary/clinic?appointment_id='.$appointment->id,
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
        AppNotificationService $notifier,
        DoctorAppointmentAvailabilityService $availability
    ): JsonResponse {
        abort_if(
            $appointment->workflow_status === AppointmentWorkflowStatus::RescheduleProposed->value,
            422,
            __('This appointment has a pending reschedule proposal. Wait for the beneficiary response before approving.'),
        );

        abort_unless(
            $appointment->status === 'pending'
                && (
                    $appointment->workflow_status === AppointmentWorkflowStatus::PendingApproval->value
                    || $appointment->workflow_status === AppointmentWorkflowStatus::Scheduled->value
                ),
            422,
            __('Only pending appointment requests can be approved.'),
        );

        abort_if($appointment->doctor_id === null, 422, __('The appointment has no assigned doctor.'));
        abort_if($appointment->scheduled_at === null, 422, __('The appointment has no scheduled date.'));

        $availability->assertNoDoctorConflict(
            (int) $appointment->doctor_id,
            Carbon::parse($appointment->scheduled_at),
            $appointment->id,
        );

        $appointment->forceFill([
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
            '/app/beneficiary/appointments?appointment_id='.$appointment->id,
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
        AppNotificationService $notifier,
        DoctorAppointmentAvailabilityService $availability
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

        $scheduledAt = Carbon::parse($validated['scheduled_at']);

        $isPendingRequest = $appointment->status === 'pending'
            && in_array($appointment->workflow_status, [
                AppointmentWorkflowStatus::PendingApproval->value,
                AppointmentWorkflowStatus::Scheduled->value,
            ], true);

        if ($isPendingRequest) {
            abort_if(
                (int) $validated['doctor_id'] !== (int) $appointment->doctor_id,
                422,
                __('The doctor cannot be changed while the request is pending approval.'),
            );

            $doctorProfile = ClinicStaffProfile::query()
                ->where('user_id', (int) $appointment->doctor_id)
                ->where('is_active', true)
                ->first();

            if ($doctorProfile !== null) {
                $availability->assertDoctorAvailableOnDate($doctorProfile, $scheduledAt, 'scheduled_at');
            }

            $availability->assertNoDoctorConflict((int) $appointment->doctor_id, $scheduledAt, $appointment->id);

            $appointment->forceFill([
                'scheduled_at' => $validated['scheduled_at'],
                'proposal_note' => $validated['proposal_note'] ?? null,
                'workflow_status' => AppointmentWorkflowStatus::PendingApproval->value,
            ])->save();

            return response()->json([
                'message' => __('Appointment time updated successfully.'),
                'appointment' => $appointment->fresh()->load(['beneficiary.family', 'doctor:id,name,email']),
            ]);
        }

        $availability->assertNoDoctorConflict((int) $validated['doctor_id'], $scheduledAt, $appointment->id);

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
            '/app/beneficiary/appointments?appointment_id='.$appointment->id,
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
            $proposedAt = Carbon::parse($appointment->proposed_scheduled_at);
            app(DoctorAppointmentAvailabilityService::class)->assertNoDoctorConflict(
                (int) $appointment->doctor_id,
                $proposedAt,
                $appointment->id,
            );

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
            '/app/secretary/clinic?appointment_id='.$appointment->id,
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
