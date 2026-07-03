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
        'campaign_id',
        'distribution_date',
        'distribution_frequency',
        'cycles_per_year',
        'eligible_families_count',
        'total_amount',
        'projected_annual_amount',
        'total_units',
        'projected_annual_units',
        'status',
        'completed_cycles',
        'notes',
        'created_by',
        'filter_criteria',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'distribution_date' => 'date',
            'cycles_per_year' => 'integer',
            'total_amount' => 'decimal:2',
            'projected_annual_amount' => 'decimal:2',
            'projected_annual_units' => 'integer',
            'completed_cycles' => 'integer',
            'filter_criteria' => 'array',
        ];
    }

    public function lines(): HasMany
    {
        return $this->hasMany(AidDistributionPlanLine::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
