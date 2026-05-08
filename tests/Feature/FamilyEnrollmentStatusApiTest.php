<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Family;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyEnrollmentStatusApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_admin_can_approve_pending_board_family(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::PendingBoard,
        ]);

        $token = $admin->createToken('test-device')->plainTextToken;

        $response = $this->patchJson(
            '/api/v1/families/'.$family->id.'/enrollment-status',
            ['enrollment_status' => 'approved'],
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertOk()
            ->assertJsonPath('family.enrollment_status', 'approved');

        $this->assertNotNull($family->fresh()->qr_token);
    }

    public function test_admin_can_reject_pending_board_family(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::PendingBoard,
        ]);

        $token = $admin->createToken('test-device')->plainTextToken;

        $response = $this->patchJson(
            '/api/v1/families/'.$family->id.'/enrollment-status',
            ['enrollment_status' => 'rejected'],
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertOk()
            ->assertJsonPath('family.enrollment_status', 'rejected');
    }

    public function test_secretary_cannot_approve_or_reject(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::PendingBoard,
        ]);

        $token = $secretary->createToken('test-device')->plainTextToken;

        $this->patchJson(
            '/api/v1/families/'.$family->id.'/enrollment-status',
            ['enrollment_status' => 'approved'],
            ['Authorization' => 'Bearer '.$token]
        )->assertForbidden();

        $this->patchJson(
            '/api/v1/families/'.$family->id.'/enrollment-status',
            ['enrollment_status' => 'rejected'],
            ['Authorization' => 'Bearer '.$token]
        )->assertForbidden();
    }

    public function test_secretary_can_submit_draft_and_withdraw_pending_board(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('test-device')->plainTextToken;

        $draftFamily = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Draft,
        ]);

        $this->patchJson(
            '/api/v1/families/'.$draftFamily->id.'/enrollment-status',
            ['enrollment_status' => 'pending_board'],
            ['Authorization' => 'Bearer '.$token]
        )->assertOk()
            ->assertJsonPath('family.enrollment_status', 'pending_board');

        $pendingFamily = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::PendingBoard,
        ]);

        $this->patchJson(
            '/api/v1/families/'.$pendingFamily->id.'/enrollment-status',
            ['enrollment_status' => 'draft'],
            ['Authorization' => 'Bearer '.$token]
        )->assertOk()
            ->assertJsonPath('family.enrollment_status', 'draft');
    }

    public function test_secretary_can_resubmit_rejected_to_pending_board(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Rejected,
        ]);

        $token = $secretary->createToken('test-device')->plainTextToken;

        $this->patchJson(
            '/api/v1/families/'.$family->id.'/enrollment-status',
            ['enrollment_status' => 'pending_board'],
            ['Authorization' => 'Bearer '.$token]
        )->assertOk()
            ->assertJsonPath('family.enrollment_status', 'pending_board');
    }

    public function test_cannot_approve_from_draft(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Draft,
        ]);

        $token = $admin->createToken('test-device')->plainTextToken;

        $this->patchJson(
            '/api/v1/families/'.$family->id.'/enrollment-status',
            ['enrollment_status' => 'approved'],
            ['Authorization' => 'Bearer '.$token]
        )->assertUnprocessable();
    }

    public function test_cannot_change_finalized_enrollment_without_valid_transition(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
        ]);

        $token = $secretary->createToken('test-device')->plainTextToken;

        $this->patchJson(
            '/api/v1/families/'.$family->id.'/enrollment-status',
            ['enrollment_status' => 'pending_board'],
            ['Authorization' => 'Bearer '.$token]
        )->assertUnprocessable();
    }

    public function test_beneficiary_cannot_update_enrollment(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::PendingBoard,
        ]);

        $token = $beneficiaryUser->createToken('test-device')->plainTextToken;

        $this->patchJson(
            '/api/v1/families/'.$family->id.'/enrollment-status',
            ['enrollment_status' => 'draft'],
            ['Authorization' => 'Bearer '.$token]
        )->assertForbidden();
    }
}
