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
        'registration_number',
        'registration_date',
        'head_name',
        'full_family_name',
        'phone',
        'address',
        'province',
        'city',
        'neighborhood',
        'housing_status',
        'members_count',
        'monthly_income',
        'previous_charity_aid',
        'urgent_needs',
        'has_direct_income',
        'aid_paused_at',
        'aid_pause_reason',
        'enrollment_status',
        'follow_up_status',
        're_evaluation_date',
        'charity_aid_history',
        'profile_completed_at',
        'system_generated_credentials',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'enrollment_status' => FamilyEnrollmentStatus::class,
            'registration_date' => 'date',
            're_evaluation_date' => 'date',
            'profile_completed_at' => 'datetime',
            'previous_charity_aid' => 'array',
            'urgent_needs' => 'array',
            'charity_aid_history' => 'array',
            'has_direct_income' => 'boolean',
            'system_generated_credentials' => 'boolean',
            'aid_paused_at' => 'datetime',
        ];
    }

    public function beneficiaries(): HasMany
    {
        return $this->hasMany(Beneficiary::class);
    }
}
