<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalRecord extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'clinic_appointment_id',
        'beneficiary_id',
        'doctor_id',
        'diagnosis',
        'tests_result',
        'prescription',
        'prescription_cost',
        'prescription_workflow_status',
        'prescription_reviewed_by',
        'prescription_reviewed_at',
        'prescription_review_note',
        'prescription_disbursed_by',
        'prescription_disbursed_at',
        'prescription_disbursement_transaction_id',
        'notes',
        'recorded_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'prescription_cost' => 'decimal:2',
            'prescription_reviewed_at' => 'datetime',
            'prescription_disbursed_at' => 'datetime',
            'recorded_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(ClinicAppointment::class, 'clinic_appointment_id');
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function prescriptionReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prescription_reviewed_by');
    }

    public function prescriptionDisburser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prescription_disbursed_by');
    }

    public function prescriptionDisbursementTransaction(): BelongsTo
    {
        return $this->belongsTo(FinancialTransaction::class, 'prescription_disbursement_transaction_id');
    }
}
