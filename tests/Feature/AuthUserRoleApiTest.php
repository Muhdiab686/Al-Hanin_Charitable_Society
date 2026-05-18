<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthUserRoleApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_login_returns_string_role_for_admin(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Doctor->value]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'password',
            'device_name' => 'test',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', 'admin');
    }

    public function test_clinic_staff_cannot_assign_admin_user(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);

        $this->putJson('/api/v1/clinic/staff', [
            'user_id' => $admin->id,
            'monthly_salary' => 100,
            'consultation_fee' => 10,
            'is_active' => true,
            'role' => 'doctor',
        ], ['Authorization' => 'Bearer '.$secretary->createToken('t')->plainTextToken])
            ->assertUnprocessable();
    }
}
