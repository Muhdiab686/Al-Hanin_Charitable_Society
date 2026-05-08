<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_secretary_can_upsert_clinic_staff_and_manage_appointments(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);

        $this->putJson('/api/v1/clinic/staff', [
            'user_id' => $doctor->id,
            'role' => 'doctor',
            'monthly_salary' => 500,
            'consultation_fee' => 8,
            'is_active' => true,
        ], ['Authorization' => 'Bearer '.$token])->assertOk();

        $beneficiary = Beneficiary::factory()->create();
        $beneficiary->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $create = $this->postJson('/api/v1/appointments', [
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'scheduled_at' => now()->addDay()->toDateTimeString(),
            'reason' => 'Routine check',
        ], ['Authorization' => 'Bearer '.$token]);

        $create->assertCreated();
        $appointmentId = $create->json('appointment.id');

        $this->patchJson('/api/v1/appointments/'.$appointmentId.'/cancel', [
            'cancellation_reason' => 'Rescheduled',
        ], ['Authorization' => 'Bearer '.$token])->assertOk()
            ->assertJsonPath('appointment.status', 'cancelled');
    }

    public function test_doctor_can_create_medical_record_and_appointment_becomes_completed(): void
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);

        $beneficiary = Beneficiary::factory()->create();
        $beneficiary->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'created_by' => $doctor->id,
            'scheduled_at' => now()->toDateTimeString(),
            'status' => 'scheduled',
        ]);

        $this->postJson('/api/v1/medical-records', [
            'clinic_appointment_id' => $appointment->id,
            'diagnosis' => 'Stable condition',
            'tests_result' => 'Blood tests normal',
            'prescription' => 'Vitamin supplements',
            'prescription_cost' => 12.5,
        ], ['Authorization' => 'Bearer '.$doctor->createToken('d')->plainTextToken])
            ->assertCreated()
            ->assertJsonPath('record.clinic_appointment_id', $appointment->id);

        $appointment->refresh();
        $this->assertSame('completed', $appointment->status);
    }
}
