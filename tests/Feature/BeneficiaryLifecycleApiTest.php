<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BeneficiaryLifecycleApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_beneficiary_registration_links_beneficiary_id(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Family Head',
            'email' => 'head@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => UserRole::Beneficiary->value,
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['beneficiary_id', 'user' => ['beneficiary_id']]);

        $this->assertDatabaseHas('beneficiaries', [
            'user_id' => $response->json('user.id'),
        ]);
    }

    public function test_beneficiary_login_returns_beneficiary_id(): void
    {
        $user = User::factory()->create([
            'email' => 'login-ben@example.com',
            'password' => 'password123',
            'role' => UserRole::Beneficiary,
        ]);
        $user->syncRoles([UserRole::Beneficiary->value]);

        Beneficiary::factory()->create([
            'user_id' => $user->id,
            'national_id' => 'NAT-LOGIN-001',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('beneficiary_id', $user->beneficiaryProfile->id);
    }

    public function test_admin_can_onboard_beneficiary_with_generated_credentials(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $admin->syncRoles([UserRole::Admin->value]);
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/beneficiaries/onboard', [
            'family' => [
                'head_name' => 'عائلة أحمد',
                'phone' => '0599000000',
                'members_count' => 5,
            ],
            'head' => [
                'name' => 'أحمد محمد',
                'national_id' => 'ONB-001',
            ],
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated()
            ->assertJsonStructure([
                'credentials' => ['email', 'password'],
                'beneficiary' => ['id', 'family_id'],
            ]);
    }

    public function test_beneficiary_dashboard_requires_linked_profile(): void
    {
        $user = User::factory()->create(['role' => UserRole::Beneficiary]);
        $user->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $user->id]);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->getJson('/api/v1/beneficiary/dashboard', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()
            ->assertJsonPath('beneficiary_id', $beneficiary->id);
    }

    public function test_secretary_cannot_list_beneficiaries_after_permission_change(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/beneficiaries', [
            'Authorization' => 'Bearer '.$token,
        ])->assertForbidden();
    }
}
