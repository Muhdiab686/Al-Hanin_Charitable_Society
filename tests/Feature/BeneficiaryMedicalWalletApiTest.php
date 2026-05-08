<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BeneficiaryMedicalWalletApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_doctor_can_credit_medical_wallet_for_beneficiary(): void
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);

        $beneficiary = Beneficiary::factory()->create([
            'medical_wallet_balance' => 0,
        ]);
        $beneficiary->family->forceFill([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
        ])->save();

        $response = $this->postJson(
            '/api/v1/beneficiaries/'.$beneficiary->id.'/medical-wallet/credits',
            [
                'amount' => 22.50,
                'prescription_reference' => 'RX-2026-0001',
                'notes' => 'Antibiotics',
            ],
            ['Authorization' => 'Bearer '.$doctor->createToken('d')->plainTextToken]
        );

        $response->assertCreated()
            ->assertJsonPath('balance', '22.50')
            ->assertJsonPath('credit.amount', '22.50');

        $this->assertDatabaseHas('medical_prescription_credits', [
            'beneficiary_id' => $beneficiary->id,
            'amount' => 22.50,
            'prescription_reference' => 'RX-2026-0001',
            'credited_by' => $doctor->id,
        ]);
    }

    public function test_beneficiary_can_view_own_wallet_only(): void
    {
        $ownerUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $ownerUser->syncRoles([UserRole::Beneficiary->value]);

        $otherUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $otherUser->syncRoles([UserRole::Beneficiary->value]);

        $ownerBeneficiary = Beneficiary::factory()->create([
            'user_id' => $ownerUser->id,
            'medical_wallet_balance' => 10,
        ]);
        $otherBeneficiary = Beneficiary::factory()->create([
            'user_id' => $otherUser->id,
            'medical_wallet_balance' => 20,
        ]);

        $this->getJson(
            '/api/v1/beneficiaries/'.$ownerBeneficiary->id.'/medical-wallet',
            ['Authorization' => 'Bearer '.$ownerUser->createToken('b1')->plainTextToken]
        )->assertOk()
            ->assertJsonPath('medical_wallet.balance', '10.00');

        $this->getJson(
            '/api/v1/beneficiaries/'.$otherBeneficiary->id.'/medical-wallet',
            ['Authorization' => 'Bearer '.$ownerUser->createToken('b2')->plainTextToken]
        )->assertForbidden();
    }

    public function test_secretary_cannot_credit_wallet_without_medical_manage_permission(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $beneficiary = Beneficiary::factory()->create([
            'medical_wallet_balance' => 0,
        ]);

        $this->postJson(
            '/api/v1/beneficiaries/'.$beneficiary->id.'/medical-wallet/credits',
            ['amount' => 15],
            ['Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken]
        )->assertForbidden();
    }
}
