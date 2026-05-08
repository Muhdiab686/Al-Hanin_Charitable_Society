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
}
