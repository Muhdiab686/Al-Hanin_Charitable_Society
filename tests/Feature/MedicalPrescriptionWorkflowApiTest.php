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

class MedicalPrescriptionWorkflowApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_prescription_disbursement_flow_from_doctor_to_secretary_to_accountant(): void
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);

        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);

        $beneficiary = Beneficiary::factory()->create([
            'medical_wallet_balance' => 0,
        ]);
        $beneficiary->family->forceFill([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
        ])->save();

        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'created_by' => $doctor->id,
            'scheduled_at' => now()->toDateTimeString(),
            'status' => 'scheduled',
        ]);

        $createRecord = $this->postJson('/api/v1/medical-records', [
            'clinic_appointment_id' => $appointment->id,
            'diagnosis' => 'Needs medication follow-up',
            'prescription' => 'Pain relief medicine',
            'prescription_cost' => 35.50,
        ], [
            'Authorization' => 'Bearer '.$doctor->createToken('doctor')->plainTextToken,
        ]);

        $createRecord->assertCreated();
        $recordId = (int) $createRecord->json('record.id');
        $this->assertDatabaseHas('medical_records', [
            'id' => $recordId,
            'prescription_workflow_status' => 'pending_secretary_review',
        ]);

        $this->patchJson('/api/v1/medical-prescriptions/'.$recordId.'/review', [
            'decision' => 'approved',
            'review_note' => 'Approved by secretary',
        ], [
            'Authorization' => 'Bearer '.$admin->createToken('admin-review')->plainTextToken,
        ])->assertOk()
            ->assertJsonPath('record.prescription_workflow_status', 'approved_by_secretary');

        $this->postJson('/api/v1/medical-prescriptions/'.$recordId.'/disburse', [
            'notes' => 'Wallet top-up for approved prescription',
        ], [
            'Authorization' => 'Bearer '.$admin->createToken('admin-disburse')->plainTextToken,
        ])->assertOk()
            ->assertJsonPath('record.prescription_workflow_status', 'disbursed');

        $beneficiary->refresh();
        $this->assertSame('35.50', $beneficiary->medical_wallet_balance);

        $this->assertDatabaseHas('medical_prescription_credits', [
            'beneficiary_id' => $beneficiary->id,
            'amount' => 35.50,
            'prescription_reference' => 'MEDREC-'.$recordId,
        ]);

        $this->assertDatabaseHas('financial_transactions', [
            'type' => 'expense',
            'source' => 'prescription_wallet_disbursement',
            'reference_type' => MedicalRecord::class,
            'reference_id' => $recordId,
        ]);
    }
}
