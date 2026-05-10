<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DonorChatApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        /** Bearer token auth must not compete with an empty stateful session during JSON tests */
        $this->withoutMiddleware(EnsureFrontendRequestsAreStateful::class);
    }

    public function test_admin_can_list_donor_users_for_chat(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);
        $donor = User::factory()->create(['role' => UserRole::Donor->value]);
        $donor->syncRoles([UserRole::Donor->value]);

        $response = $this->getJson('/api/v1/communications/donor-chat/donors', [
            'Authorization' => 'Bearer '.$admin->createToken('t')->plainTextToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('donors.0.id', $donor->id)
            ->assertJsonPath('donors.0.messages_count', 0);
    }

    public function test_non_admin_cannot_access_admin_donor_chat_routes(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $response = $this->getJson('/api/v1/communications/donor-chat/donors', [
            'Authorization' => 'Bearer '.$secretary->createToken('t')->plainTextToken,
        ]);

        $response->assertForbidden();
    }

    public function test_admin_and_donor_exchange_messages_in_same_thread(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);
        $donor = User::factory()->create(['role' => UserRole::Donor->value]);
        $donor->syncRoles([UserRole::Donor->value]);

        Sanctum::actingAs($donor);

        $this->getJson('/api/v1/donor-chat/messages')
            ->assertOk()
            ->assertJsonCount(0, 'messages');

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/communications/donor-chat/donors/'.$donor->id.'/messages', [
            'body' => 'شكراً على دعمكم',
        ])
            ->assertCreated()
            ->assertJsonPath('message.is_from_donor', false);

        Sanctum::actingAs($donor);

        $this->getJson('/api/v1/donor-chat/messages')->assertOk()->assertJsonPath('messages.0.body', 'شكراً على دعمكم');

        $this->postJson('/api/v1/donor-chat/messages', [
            'body' => 'على الرحب والسعة',
        ])
            ->assertCreated()
            ->assertJsonPath('message.is_from_donor', true);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/communications/donor-chat/donors/'.$donor->id.'/messages')->assertOk()->assertJsonCount(2, 'messages');

        $this->assertDatabaseCount('donor_chat_messages', 2);
        $this->assertDatabaseHas('donor_chat_messages', [
            'donor_id' => $donor->id,
            'sender_id' => $admin->id,
            'body' => 'شكراً على دعمكم',
        ]);
        $this->assertDatabaseHas('donor_chat_messages', [
            'donor_id' => $donor->id,
            'sender_id' => $donor->id,
            'body' => 'على الرحب والسعة',
        ]);
    }

    public function test_donor_can_list_messages_via_bearer_token(): void
    {
        $donor = User::factory()->create(['role' => UserRole::Donor->value]);
        $donor->syncRoles([UserRole::Donor->value]);

        $this->getJson('/api/v1/donor-chat/messages', [
            'Authorization' => 'Bearer '.$donor->createToken('only')->plainTextToken,
        ])->assertOk()->assertJsonCount(0, 'messages');
    }

    public function test_beneficiary_cannot_use_donor_chat_endpoints(): void
    {
        $beneficiary = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiary->syncRoles([UserRole::Beneficiary->value]);
        $token = $beneficiary->createToken('b')->plainTextToken;

        $this->getJson('/api/v1/donor-chat/messages', ['Authorization' => 'Bearer '.$token])
            ->assertForbidden();
    }

    public function test_admin_thread_for_non_donor_user_returns_404(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);
        $beneficiary = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiary->syncRoles([UserRole::Beneficiary->value]);

        $this->getJson('/api/v1/communications/donor-chat/donors/'.$beneficiary->id.'/messages', [
            'Authorization' => 'Bearer '.$admin->createToken('t')->plainTextToken,
        ])
            ->assertNotFound();
    }
}
