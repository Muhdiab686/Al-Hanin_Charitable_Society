<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\InventoryItemStatus;
use App\Enums\UserRole;
use App\Models\AidInventoryAllocation;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\InventoryItem;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AidDeliveryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    /**
     * @return array{0: AidRequest, 1: AidInventoryAllocation}
     */
    private function approvedAidRequestWithAllocation(): array
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
            'status' => 'approved',
        ]);

        $item = InventoryItem::factory()->create([
            'quantity' => 10,
            'quantity_remaining' => 7,
            'status' => InventoryItemStatus::Stored,
        ]);

        $distributor = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $distributor->syncRoles([UserRole::Storekeeper->value]);

        $allocation = AidInventoryAllocation::query()->create([
            'aid_request_id' => $aidRequest->id,
            'inventory_item_id' => $item->id,
            'quantity' => 3,
            'distributed_by' => $distributor->id,
            'notes' => 'Allocated from warehouse',
        ]);

        return [$aidRequest, $allocation];
    }

    public function test_storekeeper_can_confirm_delivery_for_allocations(): void
    {
        [$aidRequest, $allocation] = $this->approvedAidRequestWithAllocation();

        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $response = $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/deliveries',
            [
                'allocation_ids' => [$allocation->id],
                'delivery_note' => 'Received by beneficiary',
            ],
            ['Authorization' => 'Bearer '.$storekeeper->createToken('sk')->plainTextToken]
        );

        $response->assertOk()
            ->assertJsonPath('deliveries.0.id', $allocation->id);

        $this->assertDatabaseHas('aid_inventory_allocations', [
            'id' => $allocation->id,
            'delivered_by' => $storekeeper->id,
            'delivery_note' => 'Received by beneficiary',
        ]);
    }

    public function test_volunteer_can_confirm_delivery(): void
    {
        [$aidRequest, $allocation] = $this->approvedAidRequestWithAllocation();

        $volunteer = User::factory()->create(['role' => UserRole::Volunteer->value]);
        $volunteer->syncRoles([UserRole::Volunteer->value]);

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/deliveries',
            [
                'allocation_ids' => [$allocation->id],
            ],
            ['Authorization' => 'Bearer '.$volunteer->createToken('v')->plainTextToken]
        )->assertOk();
    }

    public function test_cannot_confirm_delivery_twice_for_same_allocation(): void
    {
        [$aidRequest, $allocation] = $this->approvedAidRequestWithAllocation();

        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);
        $token = $storekeeper->createToken('sk')->plainTextToken;

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/deliveries',
            ['allocation_ids' => [$allocation->id]],
            ['Authorization' => 'Bearer '.$token]
        )->assertOk();

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/deliveries',
            ['allocation_ids' => [$allocation->id]],
            ['Authorization' => 'Bearer '.$token]
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['allocation_ids']);
    }

    public function test_delivery_rejects_allocations_from_other_requests(): void
    {
        [$aidRequest] = $this->approvedAidRequestWithAllocation();
        [, $foreignAllocation] = $this->approvedAidRequestWithAllocation();

        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/deliveries',
            ['allocation_ids' => [$foreignAllocation->id]],
            ['Authorization' => 'Bearer '.$storekeeper->createToken('sk')->plainTextToken]
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['allocation_ids']);
    }

    public function test_non_approved_aid_request_cannot_be_delivered(): void
    {
        [$aidRequest, $allocation] = $this->approvedAidRequestWithAllocation();
        $aidRequest->forceFill(['status' => 'pending'])->save();

        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $this->postJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/deliveries',
            ['allocation_ids' => [$allocation->id]],
            ['Authorization' => 'Bearer '.$storekeeper->createToken('sk')->plainTextToken]
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['aid_request']);
    }
}
