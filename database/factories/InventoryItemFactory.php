<?php

namespace Database\Factories;

use App\Enums\InventoryItemStatus;
use App\Enums\InventorySpoilageCategory;
use App\Models\Donation;
use App\Models\InventoryItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InventoryItem>
 */
class InventoryItemFactory extends Factory
{
    /**
     * @var class-string<InventoryItem>
     */
    protected $model = InventoryItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = $this->faker->numberBetween(1, 100);

        return [
            'donation_id' => Donation::factory(),
            'item_code' => 'INV-'.$this->faker->unique()->numerify('########'),
            'name' => $this->faker->words(3, true),
            'spoilage_category' => InventorySpoilageCategory::NonPerishable,
            'quantity' => $quantity,
            'quantity_remaining' => $quantity,
            'expiry_date' => null,
            'condition_notes' => null,
            'storage_location' => null,
            'status' => InventoryItemStatus::Stored,
        ];
    }
}
