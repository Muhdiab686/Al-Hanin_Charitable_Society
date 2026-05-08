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

class FamilyAidEligibilityApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_secretary_can_pause_and_resume_family_aid_eligibility(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $family = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);

        $pauseResponse = $this->patchJson('/api/v1/families/'.$family->id.'/aid-eligibility', [
            'has_direct_income' => true,
            'aid_pause_reason' => 'Direct salary detected',
        ], [
            'Authorization' => 'Bearer '.$token,
        ]);

        $pauseResponse->assertOk()
            ->assertJsonPath('family.has_direct_income', true);

        $resumeResponse = $this->patchJson('/api/v1/families/'.$family->id.'/aid-eligibility', [
            'has_direct_income' => false,
        ], [
            'Authorization' => 'Bearer '.$token,
        ]);

        $resumeResponse->assertOk()
            ->assertJsonPath('family.has_direct_income', false)
            ->assertJsonPath('family.aid_paused_at', null);
    }

    public function test_cannot_pause_without_reason(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $family = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);

        $this->patchJson('/api/v1/families/'.$family->id.'/aid-eligibility', [
            'has_direct_income' => true,
        ], [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['aid_pause_reason']);
    }

    public function test_paused_family_cannot_submit_aid_request(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $beneficiaryUser->id]);
        $beneficiary->family->forceFill([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'has_direct_income' => true,
            'aid_paused_at' => now(),
            'aid_pause_reason' => 'Income',
        ])->save();

        $this->postJson('/api/v1/aid-requests', [
            'beneficiary_id' => $beneficiary->id,
            'type' => 'special_item',
            'description' => 'Need support',
        ], [
            'Authorization' => 'Bearer '.$beneficiaryUser->createToken('b')->plainTextToken,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['beneficiary_id']);
    }
}
