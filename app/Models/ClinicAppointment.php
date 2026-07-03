<?php

namespace App\Models;

use Database\Factories\ClinicAppointmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ClinicAppointment extends Model
{
    /** @use HasFactory<ClinicAppointmentFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'beneficiary_id',
        'doctor_id',
        'created_by',
        'approved_by',
        'proposed_by',
        'scheduled_at',
        'proposed_scheduled_at',
        'approved_at',
        'proposal_responded_at',
        'status',
        'payout_status',
        'doctor_payout_request_id',
        'workflow_status',
        'reason',
        'proposal_note',
        'requested_specialty',
        'cancelled_at',
        'cancellation_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'proposed_scheduled_at' => 'datetime',
            'approved_at' => 'datetime',
            'proposal_responded_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function proposer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'proposed_by');
    }

    public function medicalRecord(): HasOne
    {
        return $this->hasOne(MedicalRecord::class);
    }

    public function doctorPayoutRequest(): BelongsTo
    {
        return $this->belongsTo(DoctorPayoutRequest::class, 'doctor_payout_request_id');
    }
}
