<?php

namespace Tests\Feature\Admin;

use App\Enums\DonationType;
use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\Donation;
use App\Models\Family;
use App\Models\InventoryItem;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardAndRolesApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function adminHeaders(): array
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);

        return ['Authorization' => 'Bearer '.$admin->createToken('a')->plainTextToken];
    }

    public function test_admin_can_fetch_dashboard_stats(): void
    {
        Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::PendingBoard]);
        Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::PendingBoard]);

        $approvedFamily = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
        ]);

        Beneficiary::factory()->create(['family_id' => $approvedFamily->id]);
        Beneficiary::factory()->create(['family_id' => $approvedFamily->id]);

        $creator = User::factory()->create();
        $beneficiaryForAid = Beneficiary::factory()->create(['family_id' => $approvedFamily->id]);

        AidRequest::factory()->create([
            'beneficiary_id' => $beneficiaryForAid->id,
            'created_by' => $creator->id,
            'status' => 'pending',
        ]);
        AidRequest::factory()->create([
            'beneficiary_id' => $beneficiaryForAid->id,
            'created_by' => $creator->id,
            'status' => 'approved',
        ]);

        $response = $this->getJson('/api/v1/admin/dashboard', $this->adminHeaders());

        $response->assertOk()
            ->assertJsonPath('families.total', 3)
            ->assertJsonPath('beneficiaries.total', 3)
            ->assertJsonPath('families.by_enrollment_status.pending_board', 2)
            ->assertJsonPath('families.by_enrollment_status.approved', 1)
            ->assertJsonPath('aid_requests.by_status.pending', 1)
            ->assertJsonPath('aid_requests.by_status.approved', 1)
            ->assertJsonPath('aid_requests.total', 2);
    }

    public function test_recent_donations_include_in_kind_units_sum(): void
    {
        $donation = Donation::factory()->create(['type' => DonationType::InKind]);
        InventoryItem::factory()->create([
            'donation_id' => $donation->id,
            'quantity' => 42,
            'quantity_remaining' => 42,
        ]);

        $response = $this->getJson('/api/v1/admin/dashboard', $this->adminHeaders());

        $response->assertOk();
        $recent = collect($response->json('analytics.recent_donations'));
        $row = $recent->firstWhere('id', $donation->id);
        $this->assertNotNull($row);
        $this->assertSame(42, $row['in_kind_units']);
    }

    public function test_secretary_cannot_access_dashboard(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $this->getJson('/api/v1/admin/dashboard', [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertForbidden();
    }

    public function test_admin_can_fetch_roles_catalog(): void
    {
        $response = $this->getJson('/api/v1/admin/roles', $this->adminHeaders());

        $response->assertOk()
            ->assertJsonStructure([
                'roles',
                'assignable_roles',
            ]);

        $names = collect($response->json('roles'))->pluck('name')->sort()->values()->all();
        $this->assertContains('admin', $names);
        $this->assertContains('secretary', $names);

        $assignable = collect($response->json('assignable_roles'))->pluck('value')->all();
        $this->assertContains('secretary', $assignable);
        $this->assertContains('beneficiary', $assignable);
    }
}
