<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorPayoutRequest extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'doctor_id',
        'period_start',
        'period_end',
        'consultations_count',
        'amount',
        'status',
        'requested_by',
        'reviewed_by',
        'reviewed_at',
        'review_note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'amount' => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
