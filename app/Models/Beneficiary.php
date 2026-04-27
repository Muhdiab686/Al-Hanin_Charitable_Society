<?php

namespace App\Models;

use Database\Factories\BeneficiaryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Beneficiary extends Model
{
    /** @use HasFactory<BeneficiaryFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'family_id',
        'user_id',
        'category_id',
        'national_id',
        'name',
        'date_of_birth',
        'phone',
        'status',
        'is_head_of_family',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'is_head_of_family' => 'boolean',
        ];
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function aidRequests(): HasMany
    {
        return $this->hasMany(AidRequest::class);
    }
}
