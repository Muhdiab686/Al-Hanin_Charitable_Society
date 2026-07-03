<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'base_salary_amount',
        'consultation_fee_amount',
        'consultations_amount',
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
            'base_salary_amount' => 'decimal:2',
            'consultation_fee_amount' => 'decimal:2',
            'consultations_amount' => 'decimal:2',
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

    public function appointments(): HasMany
    {
        return $this->hasMany(ClinicAppointment::class, 'doctor_payout_request_id');
    }
}
