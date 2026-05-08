<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalPrescriptionCredit extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'beneficiary_id',
        'amount',
        'prescription_reference',
        'notes',
        'credited_by',
        'credited_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'credited_at' => 'datetime',
        ];
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function creditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'credited_by');
    }
}
