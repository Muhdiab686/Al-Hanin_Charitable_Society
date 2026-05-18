<?php

namespace App\Models;

use Database\Factories\AidRequestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AidRequest extends Model
{
    /** @use HasFactory<AidRequestFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'beneficiary_id',
        'created_by',
        'type',
        'requested_amount',
        'description',
        'public_title',
        'public_summary',
        'status',
        'submitted_at',
        'published_for_donors_at',
        'published_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'requested_amount' => 'decimal:2',
            'submitted_at' => 'datetime',
            'published_for_donors_at' => 'datetime',
        ];
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ApprovalRequest::class);
    }

    public function inventoryAllocations(): HasMany
    {
        return $this->hasMany(AidInventoryAllocation::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(AidRequestAttachment::class);
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function isPublishedForDonors(): bool
    {
        return $this->published_for_donors_at !== null
            && $this->status === 'approved';
    }
}
