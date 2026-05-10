<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Donation;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DonationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_donor_can_record_donation_with_purpose_and_pledge_frequency(): void
    {
        $user = User::factory()->create(['role' => UserRole::Donor->value]);
        $user->syncRoles([UserRole::Donor->value]);
        $token = $user->createToken('t')->plainTextToken;

        $response = $this->postJson('/api/v1/donations', [
            'type' => 'cash',
            'cash_amount' => 40,
            'channel' => 'web',
            'purpose' => 'كسوة موسم الشتاء',
            'pledge_frequency' => 'monthly',
            'notes' => 'من بوابة المتبرع',
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated();
        $this->assertDatabaseHas('donations', [
            'registered_by' => $user->id,
            'purpose' => 'كسوة موسم الشتاء',
            'pledge_frequency' => 'monthly',
            'channel' => 'web',
        ]);
    }

    public function test_accountant_can_record_cash_donation(): void
    {
        $user = User::factory()->create(['role' => UserRole::Accountant->value]);
        $user->syncRoles([UserRole::Accountant->value]);
        $token = $user->createToken('t')->plainTextToken;

        $response = $this->postJson('/api/v1/donations', [
            'type' => 'cash',
            'cash_amount' => 250.5,
            'donor_name' => 'Patron',
            'notes' => 'Monthly support',
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated()
            ->assertJsonPath('donation.type', 'cash')
            ->assertJsonPath('donation.cash_amount', '250.50');

        $this->assertDatabaseHas('donations', [
            'type' => 'cash',
            'registered_by' => $user->id,
        ]);
    }

    public function test_storekeeper_can_record_in_kind_donation_with_inventory_lines(): void
    {
        $user = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $user->syncRoles([UserRole::Storekeeper->value]);
        $token = $user->createToken('t')->plainTextToken;

        $response = $this->postJson('/api/v1/donations', [
            'type' => 'in_kind',
            'donor_name' => 'Food Bank',
            'items' => [
                [
                    'name' => 'Rice bags',
                    'spoilage_category' => 'non_perishable',
                    'quantity' => 20,
                    'storage_location' => 'Warehouse A',
                ],
            ],
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated()
            ->assertJsonPath('donation.type', 'in_kind')
            ->assertJsonCount(1, 'donation.inventory_items');

        $this->assertDatabaseHas('inventory_items', [
            'name' => 'Rice bags',
            'quantity' => 20,
        ]);
    }

    public function test_donor_cannot_record_in_kind_without_inventory_permission(): void
    {
        $user = User::factory()->create(['role' => UserRole::Donor->value]);
        $user->syncRoles([UserRole::Donor->value]);
        $token = $user->createToken('t')->plainTextToken;

        $this->postJson('/api/v1/donations', [
            'type' => 'in_kind',
            'items' => [
                [
                    'name' => 'Clothes',
                    'spoilage_category' => 'non_perishable',
                    'quantity' => 3,
                ],
            ],
        ], ['Authorization' => 'Bearer '.$token])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['type']);
    }

    public function test_beneficiary_cannot_list_donations(): void
    {
        $user = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $user->syncRoles([UserRole::Beneficiary->value]);

        $this->getJson('/api/v1/donations', [
            'Authorization' => 'Bearer '.$user->createToken('t')->plainTextToken,
        ])->assertForbidden();
    }

    public function test_donor_sees_only_own_donations_on_index(): void
    {
        $donorA = User::factory()->create(['role' => UserRole::Donor->value]);
        $donorA->syncRoles([UserRole::Donor->value]);
        $donorB = User::factory()->create(['role' => UserRole::Donor->value]);
        $donorB->syncRoles([UserRole::Donor->value]);

        Donation::factory()->create(['registered_by' => $donorA->id]);
        Donation::factory()->create(['registered_by' => $donorB->id]);

        $response = $this->getJson('/api/v1/donations', [
            'Authorization' => 'Bearer '.$donorA->createToken('t')->plainTextToken,
        ]);

        $response->assertOk();
        $this->assertSame(1, $response->json('total'));
        $this->assertSame($donorA->id, $response->json('data.0.registered_by'));
    }

    public function test_donor_cannot_view_another_users_donation(): void
    {
        $donorA = User::factory()->create(['role' => UserRole::Donor->value]);
        $donorA->syncRoles([UserRole::Donor->value]);
        $donorB = User::factory()->create(['role' => UserRole::Donor->value]);
        $donorB->syncRoles([UserRole::Donor->value]);

        $foreign = Donation::factory()->create(['registered_by' => $donorB->id]);

        $this->getJson('/api/v1/donations/'.$foreign->id, [
            'Authorization' => 'Bearer '.$donorA->createToken('t')->plainTextToken,
        ])->assertForbidden();
    }
}
