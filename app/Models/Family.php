<?php

namespace App\Models;

use App\Enums\FamilyEnrollmentStatus;
use Database\Factories\FamilyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Family extends Model
{
    /** @use HasFactory<FamilyFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $hidden = [
        'qr_token',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'family_code',
        'head_name',
        'phone',
        'address',
        'members_count',
        'monthly_income',
        'has_direct_income',
        'aid_paused_at',
        'aid_pause_reason',
        'enrollment_status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'enrollment_status' => FamilyEnrollmentStatus::class,
            'has_direct_income' => 'boolean',
            'aid_paused_at' => 'datetime',
        ];
    }

    public function beneficiaries(): HasMany
    {
        return $this->hasMany(Beneficiary::class);
    }
}
