<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AidDistributionPlanLine extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'aid_distribution_plan_id',
        'family_id',
        'beneficiary_id',
        'allocated_amount',
        'allocated_units',
        'allocation_rank',
        'allocation_note',
        'last_fulfilled_cycle',
        'last_aid_request_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'allocated_amount' => 'decimal:2',
            'last_fulfilled_cycle' => 'integer',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(AidDistributionPlan::class, 'aid_distribution_plan_id');
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function lastAidRequest(): BelongsTo
    {
        return $this->belongsTo(AidRequest::class, 'last_aid_request_id');
    }
}
