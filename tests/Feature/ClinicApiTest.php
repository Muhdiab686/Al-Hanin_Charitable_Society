<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use App\Models\ClinicStaffProfile;
use App\Models\User;
use Carbon\Carbon;
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

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createDoctorWithProfile(array $overrides = []): User
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);

        ClinicStaffProfile::query()->create(array_merge([
            'user_id' => $doctor->id,
            'specialty' => 'قلب',
            'bio' => 'طبيب قلب',
            'available_days' => ['Sunday', 'Tuesday'],
            'monthly_salary' => 500,
            'consultation_fee' => 25,
            'is_active' => true,
        ], $overrides));

        return $doctor;
    }

    private function nextAvailableDate(array $availableDays): Carbon
    {
        $date = now()->startOfDay();

        for ($offset = 0; $offset < 14; $offset++) {
            if (in_array($date->format('l'), $availableDays, true)) {
                return $date->copy();
            }

            $date->addDay();
        }

        return now()->startOfDay()->addWeek()->startOfWeek(Carbon::SUNDAY);
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

    public function test_doctor_can_update_his_own_clinic_profile(): void
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);

        $response = $this->putJson('/api/v1/doctor/profile', [
            'specialty' => 'قلب',
            'bio' => 'Senior cardiology doctor',
            'consultation_fee' => 25,
            'available_days' => ['Sunday', 'Tuesday'],
        ], [
            'Authorization' => 'Bearer '.$doctor->createToken('doctor')->plainTextToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('profile.specialty', 'قلب')
            ->assertJsonPath('profile.consultation_fee', '25.00');
    }

    public function test_beneficiary_cannot_request_appointment_on_doctor_unavailable_day(): void
    {
        $doctor = $this->createDoctorWithProfile(['available_days' => ['Sunday']]);
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        Beneficiary::factory()->create(['user_id' => $beneficiaryUser->id]);

        $unavailableDate = now()->startOfDay();
        for ($offset = 0; $offset < 14; $offset++) {
            if ($unavailableDate->format('l') !== 'Sunday') {
                break;
            }
            $unavailableDate->addDay();
        }

        $this->postJson('/api/v1/appointments/request', [
            'doctor_id' => $doctor->id,
            'requested_specialty' => 'قلب',
            'preferred_date' => $unavailableDate->toDateString(),
            'preferred_time' => '10:00',
        ], ['Authorization' => 'Bearer '.$beneficiaryUser->createToken('b')->plainTextToken])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['preferred_date']);
    }

    public function test_beneficiary_cannot_request_conflicting_appointment_hour(): void
    {
        $doctor = $this->createDoctorWithProfile();
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $beneficiaryUser->id]);

        $scheduledAt = $this->nextAvailableDate(['Sunday', 'Tuesday'])->setTime(11, 30);

        ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'created_by' => $beneficiaryUser->id,
            'scheduled_at' => $scheduledAt,
            'status' => 'scheduled',
            'workflow_status' => 'scheduled',
        ]);

        $this->postJson('/api/v1/appointments/request', [
            'doctor_id' => $doctor->id,
            'requested_specialty' => 'قلب',
            'preferred_date' => $scheduledAt->toDateString(),
            'preferred_time' => '11:45',
        ], ['Authorization' => 'Bearer '.$beneficiaryUser->createToken('b')->plainTextToken])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['scheduled_at']);
    }

    public function test_secretary_approves_pending_request_without_changing_doctor_or_datetime(): void
    {
        $doctor = $this->createDoctorWithProfile();
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $beneficiary = Beneficiary::factory()->create();
        $beneficiary->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $scheduledAt = $this->nextAvailableDate(['Sunday', 'Tuesday'])->setTime(9, 0);

        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'created_by' => $beneficiary->id,
            'scheduled_at' => $scheduledAt,
            'status' => 'pending',
            'workflow_status' => 'pending_approval',
            'requested_specialty' => 'قلب',
        ]);

        $this->patchJson('/api/v1/appointments/'.$appointment->id.'/approve', [], [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertOk()
            ->assertJsonPath('appointment.status', 'scheduled')
            ->assertJsonPath('appointment.workflow_status', 'scheduled')
            ->assertJsonPath('appointment.doctor_id', $doctor->id);

        $appointment->refresh();
        $this->assertSame($scheduledAt->toDateTimeString(), $appointment->scheduled_at->toDateTimeString());
    }

    public function test_secretary_cannot_approve_when_doctor_has_conflict_at_same_hour(): void
    {
        $doctor = $this->createDoctorWithProfile();
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $beneficiary = Beneficiary::factory()->create();
        $otherBeneficiary = Beneficiary::factory()->create();
        $beneficiary->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $scheduledAt = $this->nextAvailableDate(['Sunday', 'Tuesday'])->setTime(14, 0);

        ClinicAppointment::query()->create([
            'beneficiary_id' => $otherBeneficiary->id,
            'doctor_id' => $doctor->id,
            'created_by' => $secretary->id,
            'scheduled_at' => $scheduledAt,
            'status' => 'scheduled',
            'workflow_status' => 'scheduled',
        ]);

        $pending = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'created_by' => $beneficiary->id,
            'scheduled_at' => $scheduledAt->copy()->setMinute(15),
            'status' => 'pending',
            'workflow_status' => 'pending_approval',
            'requested_specialty' => 'قلب',
        ]);

        $this->patchJson('/api/v1/appointments/'.$pending->id.'/approve', [], [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['scheduled_at']);
    }

    public function test_secretary_can_adjust_pending_request_time_without_blocking_approval(): void
    {
        $doctor = $this->createDoctorWithProfile();
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $beneficiary = Beneficiary::factory()->create();
        $beneficiary->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $originalAt = $this->nextAvailableDate(['Sunday', 'Tuesday'])->setTime(10, 0);
        $updatedAt = $originalAt->copy()->setTime(11, 0);

        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'created_by' => $beneficiary->id,
            'scheduled_at' => $originalAt,
            'status' => 'pending',
            'workflow_status' => 'pending_approval',
            'requested_specialty' => 'قلب',
        ]);

        $this->patchJson('/api/v1/appointments/'.$appointment->id.'/propose-reschedule', [
            'doctor_id' => $doctor->id,
            'scheduled_at' => $updatedAt->toDateTimeString(),
        ], ['Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken])
            ->assertOk()
            ->assertJsonPath('appointment.workflow_status', 'pending_approval');

        $appointment->refresh();
        $this->assertSame($updatedAt->toDateTimeString(), $appointment->scheduled_at->toDateTimeString());

        $this->patchJson('/api/v1/appointments/'.$appointment->id.'/approve', [], [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertOk()
            ->assertJsonPath('appointment.status', 'scheduled')
            ->assertJsonPath('appointment.workflow_status', 'scheduled');
    }

    public function test_secretary_cannot_approve_after_reschedule_was_proposed_to_beneficiary(): void
    {
        $doctor = $this->createDoctorWithProfile();
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $beneficiary = Beneficiary::factory()->create();
        $beneficiary->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $scheduledAt = $this->nextAvailableDate(['Sunday', 'Tuesday'])->setTime(15, 0);

        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'created_by' => $secretary->id,
            'scheduled_at' => $scheduledAt,
            'status' => 'scheduled',
            'workflow_status' => 'scheduled',
        ]);

        $proposedAt = $scheduledAt->copy()->addDay()->setTime(16, 0);

        $this->patchJson('/api/v1/appointments/'.$appointment->id.'/propose-reschedule', [
            'doctor_id' => $doctor->id,
            'scheduled_at' => $proposedAt->toDateTimeString(),
        ], ['Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken])->assertOk();

        $appointment->refresh();
        $this->assertSame('reschedule_proposed', $appointment->workflow_status);

        $this->patchJson('/api/v1/appointments/'.$appointment->id.'/approve', [], [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertStatus(422);
    }
}
