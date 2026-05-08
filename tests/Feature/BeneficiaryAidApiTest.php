<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BeneficiaryAidApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_secretary_can_create_beneficiary_with_family(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $token = $secretary->createToken('test-device')->plainTextToken;

        $response = $this->postJson('/api/v1/beneficiaries', [
            'family' => [
                'head_name' => 'Family Head',
                'phone' => '0999999999',
                'address' => 'Damascus',
                'members_count' => 4,
                'monthly_income' => 100.50,
            ],
            'beneficiary' => [
                'national_id' => '12345678901',
                'name' => 'Beneficiary Person',
                'phone' => '0988888888',
                'is_head_of_family' => true,
            ],
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated()
            ->assertJsonPath('beneficiary.name', 'Beneficiary Person')
            ->assertJsonPath('beneficiary.family.head_name', 'Family Head')
            ->assertJsonPath('beneficiary.family.enrollment_status', 'pending_board');
    }

    public function test_secretary_can_create_family_as_enrollment_draft(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $token = $secretary->createToken('test-device')->plainTextToken;

        $response = $this->postJson('/api/v1/beneficiaries', [
            'family' => [
                'head_name' => 'Draft Head',
                'members_count' => 3,
                'enrollment_status' => 'draft',
            ],
            'beneficiary' => [
                'national_id' => '99887766554',
                'name' => 'Draft Beneficiary',
            ],
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated()
            ->assertJsonPath('beneficiary.family.enrollment_status', 'draft');
    }

    public function test_beneficiary_cannot_create_beneficiary_record(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $token = $beneficiaryUser->createToken('test-device')->plainTextToken;

        $this->postJson('/api/v1/beneficiaries', [
            'family' => ['head_name' => 'Head', 'members_count' => 2],
            'beneficiary' => ['national_id' => '22345678901', 'name' => 'No Access'],
        ], ['Authorization' => 'Bearer '.$token])->assertForbidden();
    }

    public function test_beneficiary_can_create_aid_request(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $beneficiaryUser->id]);
        $beneficiary->family->forceFill([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
        ])->save();

        $token = $beneficiaryUser->createToken('test-device')->plainTextToken;

        $response = $this->postJson('/api/v1/aid-requests', [
            'beneficiary_id' => $beneficiary->id,
            'type' => 'urgent_financial',
            'requested_amount' => 250.75,
            'description' => 'Urgent surgery payment',
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated()
            ->assertJsonPath('aid_request.status', 'pending')
            ->assertJsonPath('aid_request.type', 'urgent_financial');
    }

    public function test_beneficiary_cannot_create_aid_request_when_family_not_approved(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $beneficiaryUser->id]);

        $token = $beneficiaryUser->createToken('test-device')->plainTextToken;

        $this->postJson('/api/v1/aid-requests', [
            'beneficiary_id' => $beneficiary->id,
            'type' => 'urgent_financial',
            'requested_amount' => 100,
            'description' => 'Should fail',
        ], ['Authorization' => 'Bearer '.$token])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['beneficiary_id']);
    }
}
