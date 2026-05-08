<?php

namespace App\Models;

use App\Enums\InventoryItemStatus;
use App\Enums\InventorySpoilageCategory;
use Database\Factories\InventoryItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    /** @use HasFactory<InventoryItemFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'donation_id',
        'item_code',
        'name',
        'spoilage_category',
        'quantity',
        'quantity_remaining',
        'expiry_date',
        'condition_notes',
        'storage_location',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'spoilage_category' => InventorySpoilageCategory::class,
            'status' => InventoryItemStatus::class,
            'expiry_date' => 'date',
        ];
    }

    public function donation(): BelongsTo
    {
        return $this->belongsTo(Donation::class);
    }

    public function inventoryAllocations(): HasMany
    {
        return $this->hasMany(AidInventoryAllocation::class);
    }

    public function removals(): HasMany
    {
        return $this->hasMany(InventoryRemoval::class);
    }
}
