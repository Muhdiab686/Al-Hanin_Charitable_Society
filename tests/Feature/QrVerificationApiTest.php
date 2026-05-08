<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\Family;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrVerificationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_volunteer_can_verify_valid_qr_payload(): void
    {
        $volunteer = User::factory()->create(['role' => UserRole::Volunteer->value]);
        $volunteer->syncRoles([UserRole::Volunteer->value]);

        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'qr_token' => '660e8400-e29b-41d4-a716-446655440099',
        ]);
        Beneficiary::factory()->create(['family_id' => $family->id]);

        $token = $volunteer->createToken('test-device')->plainTextToken;

        $response = $this->postJson(
            '/api/v1/qr/verify',
            ['payload' => 'hanin:660e8400-e29b-41d4-a716-446655440099'],
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertOk()
            ->assertJsonPath('verified', true)
            ->assertJsonPath('family.id', $family->id)
            ->assertJsonPath('payload', 'hanin:660e8400-e29b-41d4-a716-446655440099');

        $this->assertArrayNotHasKey('qr_token', $response->json('family'));
    }

    public function test_verify_rejects_malformed_payload(): void
    {
        $volunteer = User::factory()->create(['role' => UserRole::Volunteer->value]);
        $volunteer->syncRoles([UserRole::Volunteer->value]);
        $auth = ['Authorization' => 'Bearer '.$volunteer->createToken('t')->plainTextToken];

        $this->postJson('/api/v1/qr/verify', ['payload' => 'invalid'], $auth)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload']);
    }

    public function test_verify_rejects_unknown_or_ineligible_token(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);
        $auth = ['Authorization' => 'Bearer '.$storekeeper->createToken('t')->plainTextToken];

        $this->postJson(
            '/api/v1/qr/verify',
            ['payload' => 'hanin:770e8400-e29b-41d4-a716-446655440088'],
            $auth
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['payload']);
    }

    public function test_verify_rejects_non_approved_family_even_if_token_matches(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::PendingBoard,
            'qr_token' => '880e8400-e29b-41d4-a716-446655440077',
        ]);

        $auth = ['Authorization' => 'Bearer '.$secretary->createToken('t')->plainTextToken];

        $this->postJson(
            '/api/v1/qr/verify',
            ['payload' => 'hanin:880e8400-e29b-41d4-a716-446655440077'],
            $auth
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['payload']);
    }

    public function test_beneficiary_cannot_call_verify_endpoint(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);

        $auth = ['Authorization' => 'Bearer '.$beneficiaryUser->createToken('t')->plainTextToken];

        $this->postJson(
            '/api/v1/qr/verify',
            ['payload' => 'hanin:990e8400-e29b-41d4-a716-446655440066'],
            $auth
        )->assertForbidden();
    }
}
