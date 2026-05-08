<?php

namespace Tests\Feature;

use App\Enums\InventoryItemStatus;
use App\Enums\UserRole;
use App\Models\InventoryItem;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_storekeeper_can_list_inventory_with_filters(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);
        $token = $storekeeper->createToken('sk')->plainTextToken;

        InventoryItem::factory()->create([
            'name' => 'Rice bag',
            'status' => InventoryItemStatus::Stored,
            'spoilage_category' => 'non_perishable',
            'expiry_date' => null,
        ]);
        InventoryItem::factory()->create([
            'name' => 'Medicine strip',
            'status' => InventoryItemStatus::Stored,
            'spoilage_category' => 'perishable',
            'expiry_date' => now()->subDay()->toDateString(),
        ]);

        $response = $this->getJson('/api/v1/inventory-items?status=stored&spoilage_category=perishable&q=Medicine&expires_before='.now()->toDateString(), [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.name', 'Medicine strip');
    }

    public function test_storekeeper_can_remove_inventory_with_reason_and_mark_disposed_when_depleted(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);
        $token = $storekeeper->createToken('sk')->plainTextToken;

        $item = InventoryItem::factory()->create([
            'quantity' => 3,
            'quantity_remaining' => 3,
            'status' => InventoryItemStatus::Stored,
        ]);

        $response = $this->postJson('/api/v1/inventory-items/'.$item->id.'/remove', [
            'quantity' => 3,
            'reason' => 'expired',
            'notes' => 'Expired stock',
        ], [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertCreated()
            ->assertJsonPath('inventory_item.quantity_remaining', 0)
            ->assertJsonPath('inventory_item.status', InventoryItemStatus::Disposed->value)
            ->assertJsonPath('removal.reason', 'expired');

        $this->assertDatabaseHas('inventory_removals', [
            'inventory_item_id' => $item->id,
            'quantity' => 3,
            'reason' => 'expired',
        ]);
    }

    public function test_cannot_remove_more_than_available_quantity(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);
        $token = $storekeeper->createToken('sk')->plainTextToken;

        $item = InventoryItem::factory()->create([
            'quantity' => 2,
            'quantity_remaining' => 2,
            'status' => InventoryItemStatus::Stored,
        ]);

        $this->postJson('/api/v1/inventory-items/'.$item->id.'/remove', [
            'quantity' => 5,
            'reason' => 'damaged',
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity']);
    }

    public function test_user_without_inventory_permissions_cannot_remove_items(): void
    {
        $donor = User::factory()->create(['role' => UserRole::Donor->value]);
        $donor->syncRoles([UserRole::Donor->value]);

        $item = InventoryItem::factory()->create([
            'quantity' => 2,
            'quantity_remaining' => 2,
            'status' => InventoryItemStatus::Stored,
        ]);

        $this->postJson('/api/v1/inventory-items/'.$item->id.'/remove', [
            'quantity' => 1,
            'reason' => 'other',
        ], [
            'Authorization' => 'Bearer '.$donor->createToken('d')->plainTextToken,
        ])->assertForbidden();
    }
}
