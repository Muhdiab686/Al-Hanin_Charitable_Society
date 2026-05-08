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

class FamilyQrCodeApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_secretary_can_fetch_qr_for_approved_family(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'qr_token' => '550e8400-e29b-41d4-a716-446655440001',
        ]);

        $token = $secretary->createToken('test-device')->plainTextToken;

        $response = $this->getJson('/api/v1/families/'.$family->id.'/qr-code', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()
            ->assertJsonPath('mime_type', 'image/png')
            ->assertJsonPath('payload', 'hanin:550e8400-e29b-41d4-a716-446655440001');

        $this->assertNotEmpty($response->json('png_base64'));
    }

    public function test_beneficiary_can_fetch_own_family_qr(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'qr_token' => '550e8400-e29b-41d4-a716-446655440002',
        ]);
        Beneficiary::factory()->create([
            'user_id' => $beneficiaryUser->id,
            'family_id' => $family->id,
        ]);

        $token = $beneficiaryUser->createToken('test-device')->plainTextToken;

        $this->getJson('/api/v1/families/'.$family->id.'/qr-code', [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();
    }

    public function test_beneficiary_cannot_fetch_another_family_qr(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $ownFamily = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        Beneficiary::factory()->create([
            'user_id' => $beneficiaryUser->id,
            'family_id' => $ownFamily->id,
        ]);
        $otherFamily = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'qr_token' => '550e8400-e29b-41d4-a716-446655440003',
        ]);

        $token = $beneficiaryUser->createToken('test-device')->plainTextToken;

        $this->getJson('/api/v1/families/'.$otherFamily->id.'/qr-code', [
            'Authorization' => 'Bearer '.$token,
        ])->assertForbidden();
    }

    public function test_qr_not_available_when_family_not_approved(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::PendingBoard,
            'qr_token' => null,
        ]);

        $token = $secretary->createToken('test-device')->plainTextToken;

        $this->getJson('/api/v1/families/'.$family->id.'/qr-code', [
            'Authorization' => 'Bearer '.$token,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['family']);
    }
}
