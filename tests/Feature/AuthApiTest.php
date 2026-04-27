<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_user_can_register_with_default_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Beneficiary User',
            'email' => 'beneficiary@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role', UserRole::Beneficiary->value)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'name', 'email', 'role'],
            ]);
    }

    public function test_user_can_register_with_donor_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Donor User',
            'email' => 'donor@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => UserRole::Donor->value,
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role', UserRole::Donor->value);
    }

    public function test_user_can_login_and_get_token(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonStructure(['message', 'token', 'user']);
    }

    public function test_user_cannot_login_with_wrong_password(): void
    {
        $user = User::factory()->create([
            'email' => 'wrong-password@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'invalid-password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_get_profile_and_logout(): void
    {
        $user = User::factory()->create();

        $token = $user->createToken('test-device')->plainTextToken;

        $headers = [
            'Authorization' => 'Bearer '.$token,
        ];

        $this->getJson('/api/v1/auth/me', $headers)
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $this->postJson('/api/v1/auth/logout', [], $headers)
            ->assertOk()
            ->assertJsonPath('message', 'Logged out successfully.');
    }

    public function test_non_admin_user_cannot_access_admin_route(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::Beneficiary->value,
        ]);
        $user->syncRoles([UserRole::Beneficiary->value]);
        $token = $user->createToken('test-device')->plainTextToken;

        $this->getJson('/api/v1/auth/admin/ping', [
            'Authorization' => 'Bearer '.$token,
        ])->assertForbidden();
    }

    public function test_admin_user_can_access_admin_route(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::Admin->value,
        ]);
        $user->syncRoles([UserRole::Admin->value]);
        $token = $user->createToken('test-device')->plainTextToken;

        $this->getJson('/api/v1/auth/admin/ping', [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()
            ->assertJsonPath('message', 'Admin access granted.');
    }
}
