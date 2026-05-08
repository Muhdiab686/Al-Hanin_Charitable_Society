<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMedicalRecordRequest;
use App\Models\ClinicAppointment;
use App\Models\MedicalRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MedicalRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MedicalRecord::query()
            ->with(['beneficiary.family', 'doctor:id,name,email', 'appointment'])
            ->latest('recorded_at');

        if ($request->filled('beneficiary_id')) {
            $query->where('beneficiary_id', (int) $request->integer('beneficiary_id'));
        }

        if ($request->filled('doctor_id')) {
            $query->where('doctor_id', (int) $request->integer('doctor_id'));
        }

        return response()->json($query->paginate(15));
    }

    public function store(StoreMedicalRecordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $record = DB::transaction(function () use ($validated): MedicalRecord {
            $appointment = ClinicAppointment::query()
                ->whereKey($validated['clinic_appointment_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($appointment->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'clinic_appointment_id' => [__('Cancelled appointments cannot produce medical records.')],
                ]);
            }

            if ($appointment->medicalRecord()->exists()) {
                throw ValidationException::withMessages([
                    'clinic_appointment_id' => [__('A medical record already exists for this appointment.')],
                ]);
            }

            $record = MedicalRecord::query()->create([
                'clinic_appointment_id' => $appointment->id,
                'beneficiary_id' => $appointment->beneficiary_id,
                'doctor_id' => $appointment->doctor_id,
                'diagnosis' => $validated['diagnosis'],
                'tests_result' => $validated['tests_result'] ?? null,
                'prescription' => $validated['prescription'] ?? null,
                'prescription_cost' => $validated['prescription_cost'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'recorded_at' => now(),
            ]);

            $appointment->forceFill(['status' => 'completed'])->save();

            return $record;
        });

        return response()->json([
            'message' => __('Medical record created successfully.'),
            'record' => $record->load(['beneficiary.family', 'doctor:id,name,email', 'appointment']),
        ], 201);
    }
}
