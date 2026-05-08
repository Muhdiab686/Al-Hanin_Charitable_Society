<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function adminToken(): string
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);

        return $admin->createToken('admin-device')->plainTextToken;
    }

    public function test_admin_can_list_users_with_filters(): void
    {
        User::factory()->create([
            'name' => 'Zara Secretary',
            'email' => 'zara@hanin.test',
            'role' => UserRole::Secretary->value,
        ]);

        $headers = ['Authorization' => 'Bearer '.$this->adminToken()];

        $response = $this->getJson('/api/v1/admin/users?search=zara&role=secretary', $headers);

        $response->assertOk()
            ->assertJsonFragment(['email' => 'zara@hanin.test'])
            ->assertJsonFragment(['role' => 'secretary'])
            ->assertJsonStructure(['data', 'current_page', 'per_page']);
    }

    public function test_non_admin_without_users_manage_cannot_list_admin_users(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $this->getJson('/api/v1/admin/users', ['Authorization' => 'Bearer '.$token])
            ->assertForbidden();
    }

    public function test_admin_can_create_user_and_sync_role(): void
    {
        $headers = ['Authorization' => 'Bearer '.$this->adminToken()];

        $response = $this->postJson('/api/v1/admin/users', [
            'name' => 'New Accountant',
            'email' => 'acct@hanin.test',
            'password' => 'password-n',
            'password_confirmation' => 'password-n',
            'role' => UserRole::Accountant->value,
        ], $headers);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'acct@hanin.test')
            ->assertJsonPath('user.role', 'accountant')
            ->assertJsonPath('user.roles', ['accountant']);

        $this->assertDatabaseHas('users', ['email' => 'acct@hanin.test', 'role' => 'accountant']);
    }

    public function test_admin_can_update_user_role_and_password(): void
    {
        $target = User::factory()->create([
            'email' => 'target@hanin.test',
            'role' => UserRole::Volunteer->value,
        ]);
        $target->syncRoles([UserRole::Volunteer->value]);

        $headers = ['Authorization' => 'Bearer '.$this->adminToken()];

        $response = $this->putJson('/api/v1/admin/users/'.$target->id, [
            'role' => UserRole::Storekeeper->value,
            'password' => 'new-pass-w',
            'password_confirmation' => 'new-pass-w',
        ], $headers);

        $response->assertOk()
            ->assertJsonPath('user.role', 'storekeeper');

        $this->assertTrue($target->fresh()->role === UserRole::Storekeeper);
    }

    public function test_admin_cannot_delete_self(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);
        $token = $admin->createToken('admin-self')->plainTextToken;

        $this->deleteJson('/api/v1/admin/users/'.$admin->id, [], ['Authorization' => 'Bearer '.$token])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user']);
    }

    public function test_admin_can_delete_other_user(): void
    {
        $adminToken = $this->adminToken();
        $victim = User::factory()->create(['role' => UserRole::Doctor->value]);
        $victim->syncRoles([UserRole::Doctor->value]);
        $victim->createToken('x')->plainTextToken;

        $this->deleteJson('/api/v1/admin/users/'.$victim->id, [], ['Authorization' => 'Bearer '.$adminToken])
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $victim->id]);
    }

    public function test_admin_can_show_single_user(): void
    {
        $subject = User::factory()->create(['role' => UserRole::Secretary->value]);
        $subject->syncRoles([UserRole::Secretary->value]);

        $this->getJson('/api/v1/admin/users/'.$subject->id, ['Authorization' => 'Bearer '.$this->adminToken()])
            ->assertOk()
            ->assertJsonPath('user.id', $subject->id)
            ->assertJsonPath('user.roles', ['secretary']);
    }
}
