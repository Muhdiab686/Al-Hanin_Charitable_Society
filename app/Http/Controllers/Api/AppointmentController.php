<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CancelClinicAppointmentRequest;
use App\Http\Requests\StoreClinicAppointmentRequest;
use App\Models\ClinicAppointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ClinicAppointment::query()
            ->with(['beneficiary.family', 'doctor:id,name,email'])
            ->latest('scheduled_at');

        if ($request->filled('from')) {
            $query->whereDate('scheduled_at', '>=', (string) $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('scheduled_at', '<=', (string) $request->string('to'));
        }

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
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
            'reason' => $validated['reason'] ?? null,
        ]);

        return response()->json([
            'message' => __('Appointment created successfully.'),
            'appointment' => $appointment->load(['beneficiary.family', 'doctor:id,name,email']),
        ], 201);
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
            'cancelled_at' => now(),
            'cancellation_reason' => $request->validated('cancellation_reason'),
        ])->save();

        return response()->json([
            'message' => __('Appointment cancelled successfully.'),
            'appointment' => $appointment->fresh()->load(['beneficiary.family', 'doctor:id,name,email']),
        ]);
    }
}
