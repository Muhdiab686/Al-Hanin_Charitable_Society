<?php

namespace App\Models;

use App\Enums\InventoryRemovalReason;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryRemoval extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'inventory_item_id',
        'quantity',
        'reason',
        'notes',
        'removed_by',
        'removed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reason' => InventoryRemovalReason::class,
            'removed_at' => 'datetime',
        ];
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function remover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'removed_by');
    }
}
