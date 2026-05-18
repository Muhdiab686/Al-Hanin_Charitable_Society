<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\Donation;
use App\Models\Family;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleOverviewApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_admin_cannot_use_role_overview_endpoint(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);

        $this->getJson('/api/v1/overview', [
            'Authorization' => 'Bearer '.$admin->createToken('t')->plainTextToken,
        ])->assertForbidden();
    }

    public function test_secretary_overview_returns_role_payload(): void
    {
        $user = User::factory()->create(['role' => UserRole::Secretary->value]);
        $user->syncRoles([UserRole::Secretary->value]);

        $creator = User::factory()->create();
        $family = Family::factory()->create();
        $beneficiary = Beneficiary::factory()->create(['family_id' => $family->id]);

        AidRequest::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'created_by' => $creator->id,
            'status' => 'pending',
        ]);

        $response = $this->getJson('/api/v1/overview', [
            'Authorization' => 'Bearer '.$user->createToken('s')->plainTextToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('_kind', 'role_overview')
            ->assertJsonPath('role', 'secretary')
            ->assertJsonStructure([
                'title',
                'widgets',
                'charts',
            ]);
    }

    public function test_recording_secretary_overview_returns_role_payload(): void
    {
        $user = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $user->syncRoles([UserRole::RecordingSecretary->value]);

        $this->getJson('/api/v1/overview', [
            'Authorization' => 'Bearer '.$user->createToken('rs')->plainTextToken,
        ])
            ->assertOk()
            ->assertJsonPath('role', 'recording_secretary')
            ->assertJsonPath('title', 'لوحة أمين السر — لمحة يومية');
    }

    public function test_donor_overview_includes_own_donation_stats(): void
    {
        $donor = User::factory()->create(['role' => UserRole::Donor->value]);
        $donor->syncRoles([UserRole::Donor->value]);

        Donation::factory()->create([
            'registered_by' => $donor->id,
            'type' => 'cash',
            'cash_amount' => 100,
        ]);

        $this->getJson('/api/v1/overview', [
            'Authorization' => 'Bearer '.$donor->createToken('d')->plainTextToken,
        ])
            ->assertOk()
            ->assertJsonPath('_kind', 'role_overview')
            ->assertJsonPath('role', 'donor')
            ->assertJsonPath('widgets.0.key', 'contributions_logged');
    }
}
