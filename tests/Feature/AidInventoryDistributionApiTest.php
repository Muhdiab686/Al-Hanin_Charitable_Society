<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\InventoryItemStatus;
use App\Enums\UserRole;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\InventoryItem;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AidInventoryDistributionApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function approvedAidRequest(string $type = 'special_item'): AidRequest
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $beneficiaryUser->id]);
        $beneficiary->family->forceFill([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
        ])->save();

        return AidRequest::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'created_by' => $beneficiaryUser->id,
            'type' => $type,
            'status' => 'approved',
        ]);
    }

    private function storekeeperToken(): string
    {
        $user = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $user->syncRoles([UserRole::Storekeeper->value]);

        return $user->createToken('sk')->plainTextToken;
    }

    public function test_storekeeper_can_allocate_inventory_to_approved_non_cash_aid_request(): void
    {
        $aidRequest = $this->approvedAidRequest('special_item');

        $item = InventoryItem::factory()->create([
            'quantity' => 25,
            'quantity_remaining' => 25,
            'status' => InventoryItemStatus::Stored,
        ]);

        $response = $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/inventory-distributions',
            [
                'items' => [
                    [
                        'inventory_item_id' => $item->id,
                        'quantity' => 10,
                        'notes' => 'First batch',
                    ],
                ],
            ],
            ['Authorization' => 'Bearer '.$this->storekeeperToken()]
        );

        $response->assertCreated()
            ->assertJsonPath('allocations.0.quantity', 10);

        $this->assertDatabaseHas('aid_inventory_allocations', [
            'aid_request_id' => $aidRequest->id,
            'inventory_item_id' => $item->id,
            'quantity' => 10,
        ]);

        $item->refresh();
        $this->assertSame(15, $item->quantity_remaining);
        $this->assertSame(InventoryItemStatus::Stored, $item->status);
    }

    public function test_allocation_depleting_stock_marks_inventory_item_distributed(): void
    {
        $aidRequest = $this->approvedAidRequest('medical_prescription');

        $item = InventoryItem::factory()->create([
            'quantity' => 5,
            'quantity_remaining' => 5,
            'status' => InventoryItemStatus::Stored,
        ]);

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/inventory-distributions',
            [
                'items' => [
                    ['inventory_item_id' => $item->id, 'quantity' => 5],
                ],
            ],
            ['Authorization' => 'Bearer '.$this->storekeeperToken()]
        )->assertCreated();

        $item->refresh();
        $this->assertSame(0, $item->quantity_remaining);
        $this->assertSame(InventoryItemStatus::Distributed, $item->status);
    }

    public function test_cannot_allocate_more_than_remaining_quantity(): void
    {
        $aidRequest = $this->approvedAidRequest();

        $item = InventoryItem::factory()->create([
            'quantity' => 3,
            'quantity_remaining' => 3,
            'status' => InventoryItemStatus::Stored,
        ]);

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/inventory-distributions',
            [
                'items' => [
                    ['inventory_item_id' => $item->id, 'quantity' => 10],
                ],
            ],
            ['Authorization' => 'Bearer '.$this->storekeeperToken()]
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['items']);
    }

    public function test_pending_aid_request_cannot_receive_inventory(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $beneficiaryUser->id]);
        $beneficiary->family->forceFill([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
        ])->save();

        $aidRequest = AidRequest::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'created_by' => $beneficiaryUser->id,
            'type' => 'special_item',
            'status' => 'pending',
        ]);

        $item = InventoryItem::factory()->create([
            'quantity' => 10,
            'quantity_remaining' => 10,
            'status' => InventoryItemStatus::Stored,
        ]);

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/inventory-distributions',
            [
                'items' => [
                    ['inventory_item_id' => $item->id, 'quantity' => 1],
                ],
            ],
            ['Authorization' => 'Bearer '.$this->storekeeperToken()]
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['aid_request']);
    }

    public function test_cash_type_aid_request_cannot_receive_inventory(): void
    {
        $aidRequest = $this->approvedAidRequest('urgent_financial');

        $item = InventoryItem::factory()->create([
            'quantity' => 10,
            'quantity_remaining' => 10,
            'status' => InventoryItemStatus::Stored,
        ]);

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/inventory-distributions',
            [
                'items' => [
                    ['inventory_item_id' => $item->id, 'quantity' => 1],
                ],
            ],
            ['Authorization' => 'Bearer '.$this->storekeeperToken()]
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['aid_request']);
    }

    public function test_secretary_without_distribute_permission_cannot_allocate(): void
    {
        $aidRequest = $this->approvedAidRequest();

        $item = InventoryItem::factory()->create([
            'quantity' => 10,
            'quantity_remaining' => 10,
            'status' => InventoryItemStatus::Stored,
        ]);

        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/inventory-distributions',
            [
                'items' => [
                    ['inventory_item_id' => $item->id, 'quantity' => 1],
                ],
            ],
            ['Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken]
        )->assertForbidden();
    }

    public function test_storekeeper_can_list_aid_requests_after_permission_extension(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $this->getJson('/api/v1/aid-requests', [
            'Authorization' => 'Bearer '.$storekeeper->createToken('sk')->plainTextToken,
        ])->assertOk();
    }
}
