<?php

namespace Database\Factories;

use App\Models\AidInventoryAllocation;
use App\Models\AidRequest;
use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AidInventoryAllocation>
 */
class AidInventoryAllocationFactory extends Factory
{
    /**
     * @var class-string<AidInventoryAllocation>
     */
    protected $model = AidInventoryAllocation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'aid_request_id' => AidRequest::factory(),
            'inventory_item_id' => InventoryItem::factory(),
            'quantity' => $this->faker->numberBetween(1, 5),
            'distributed_by' => User::factory(),
            'notes' => null,
        ];
    }
}
