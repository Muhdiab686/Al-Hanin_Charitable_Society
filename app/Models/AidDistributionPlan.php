<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AidDistributionPlan extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'aid_type',
        'distribution_date',
        'eligible_families_count',
        'total_amount',
        'total_units',
        'status',
        'notes',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'distribution_date' => 'date',
            'total_amount' => 'decimal:2',
        ];
    }

    public function lines(): HasMany
    {
        return $this->hasMany(AidDistributionPlanLine::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
