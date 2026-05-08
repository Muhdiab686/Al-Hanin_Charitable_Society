<?php

namespace App\Models;

use Database\Factories\AidInventoryAllocationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AidInventoryAllocation extends Model
{
    /** @use HasFactory<AidInventoryAllocationFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'aid_request_id',
        'inventory_item_id',
        'quantity',
        'distributed_by',
        'delivered_by',
        'delivered_at',
        'notes',
        'delivery_note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'delivered_at' => 'datetime',
        ];
    }

    public function aidRequest(): BelongsTo
    {
        return $this->belongsTo(AidRequest::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function distributor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'distributed_by');
    }

    public function deliveryOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivered_by');
    }
}
