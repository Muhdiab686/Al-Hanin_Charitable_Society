<?php

namespace App\Models;

use Database\Factories\BeneficiaryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Beneficiary extends Model
{
    /** @use HasFactory<BeneficiaryFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'family_id',
        'user_id',
        'category_id',
        'national_id',
        'name',
        'date_of_birth',
        'age',
        'phone',
        'additional_phone',
        'status',
        'medical_wallet_balance',
        'is_head_of_family',
        'family_relationship',
        'gender',
        'marital_status',
        'education_level',
        'employment_status',
        'profession',
        'workplace',
        'income_type',
        'monthly_income',
        'health_status',
        'health_details',
        'is_housewife',
        'kinship_degree',
        'orphan_status',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'medical_wallet_balance' => 'decimal:2',
            'monthly_income' => 'decimal:2',
            'is_head_of_family' => 'boolean',
            'is_housewife' => 'boolean',
        ];
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function aidRequests(): HasMany
    {
        return $this->hasMany(AidRequest::class);
    }

    public function prescriptionCredits(): HasMany
    {
        return $this->hasMany(MedicalPrescriptionCredit::class);
    }

    /** Laboratory / imaging uploads linked administratively to the beneficiary (UC-34). */
    public function labReports(): HasMany
    {
        return $this->hasMany(BeneficiaryLabReport::class);
    }

    /** Volunteer/outreach activities this beneficiary was linked to (e.g. awareness sessions). */
    public function outreachVolunteerOpportunities(): BelongsToMany
    {
        return $this->belongsToMany(VolunteerOpportunity::class, 'bf_vol_opp_links')->withTimestamps();
    }
}
