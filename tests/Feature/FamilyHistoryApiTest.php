<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Models\AidInventoryAllocation;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use App\Models\Family;
use App\Models\MedicalRecord;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyHistoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_staff_can_load_unified_family_history_with_summary(): void
    {
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('beneficiaries.view');

        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
        ]);
        $beneficiary = Beneficiary::factory()->create([
            'family_id' => $family->id,
            'is_head_of_family' => true,
        ]);
        $doctor = User::factory()->create();
        $appointment = ClinicAppointment::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
        ]);

        $aidRequest = AidRequest::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'delivered',
        ]);
        AidInventoryAllocation::factory()->create([
            'aid_request_id' => $aidRequest->id,
            'delivered_at' => now(),
        ]);

        MedicalRecord::query()->create([
            'clinic_appointment_id' => $appointment->id,
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'diagnosis' => 'Test diagnosis',
            'prescription' => 'Test prescription',
            'prescription_cost' => 25,
            'prescription_workflow_status' => 'disbursed',
            'recorded_at' => now(),
        ]);

        $response = $this->getJson("/api/v1/families/{$family->id}/history", [
            'Authorization' => 'Bearer '.$viewer->createToken('history')->plainTextToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('family.id', $family->id)
            ->assertJsonPath('summary.beneficiaries_count', 1)
            ->assertJsonPath('summary.aid_requests_count', 1)
            ->assertJsonPath('summary.delivered_allocations_count', 1)
            ->assertJsonPath('summary.medical_records_count', 1)
            ->assertJsonPath('summary.disbursed_prescriptions_count', 1);
    }
}
