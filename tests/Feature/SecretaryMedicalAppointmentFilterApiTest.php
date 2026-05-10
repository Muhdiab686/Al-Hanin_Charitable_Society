<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use App\Models\MedicalRecord;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecretaryMedicalAppointmentFilterApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_appointments_index_filters_by_beneficiary_id_query(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);

        $b1 = Beneficiary::factory()->create();
        $b1->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();
        $b2 = Beneficiary::factory()->create();
        $b2->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $a1 = ClinicAppointment::query()->create([
            'beneficiary_id' => $b1->id,
            'doctor_id' => $doctor->id,
            'created_by' => $secretary->id,
            'scheduled_at' => now()->addDay()->toDateTimeString(),
            'status' => 'scheduled',
        ]);
        ClinicAppointment::query()->create([
            'beneficiary_id' => $b2->id,
            'doctor_id' => $doctor->id,
            'created_by' => $secretary->id,
            'scheduled_at' => now()->addDays(2)->toDateTimeString(),
            'status' => 'scheduled',
        ]);

        $response = $this->getJson('/api/v1/appointments?beneficiary_id='.$b1->id.'&status=scheduled&page=1', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.0.id', $a1->id);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_medical_records_index_filters_by_beneficiary_id_query(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);

        $b1 = Beneficiary::factory()->create();
        $b2 = Beneficiary::factory()->create();

        $ap1 = ClinicAppointment::query()->create([
            'beneficiary_id' => $b1->id,
            'doctor_id' => $doctor->id,
            'created_by' => $secretary->id,
            'scheduled_at' => now()->subDay()->toDateTimeString(),
            'status' => 'completed',
        ]);
        $ap2 = ClinicAppointment::query()->create([
            'beneficiary_id' => $b2->id,
            'doctor_id' => $doctor->id,
            'created_by' => $secretary->id,
            'scheduled_at' => now()->subHours(2)->toDateTimeString(),
            'status' => 'completed',
        ]);

        $r1 = MedicalRecord::query()->create([
            'clinic_appointment_id' => $ap1->id,
            'beneficiary_id' => $b1->id,
            'doctor_id' => $doctor->id,
            'diagnosis' => 'DX1',
            'recorded_at' => now(),
        ]);
        MedicalRecord::query()->create([
            'clinic_appointment_id' => $ap2->id,
            'beneficiary_id' => $b2->id,
            'doctor_id' => $doctor->id,
            'diagnosis' => 'DX2',
            'recorded_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/medical-records?beneficiary_id='.$b1->id.'&page=1', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.0.id', $r1->id);
        $this->assertCount(1, $response->json('data'));
    }
}
