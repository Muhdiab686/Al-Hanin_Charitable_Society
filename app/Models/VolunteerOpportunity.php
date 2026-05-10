<?php

namespace App\Models;

use App\Enums\VolunteerActivityKind;
use Database\Factories\VolunteerOpportunityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VolunteerOpportunity extends Model
{
    /** @use HasFactory<VolunteerOpportunityFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'description',
        'required_slots',
        'filled_slots',
        'starts_at',
        'ends_at',
        'status',
        'activity_kind',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'activity_kind' => VolunteerActivityKind::class,
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(VolunteerOpportunityRegistration::class);
    }

    /** Beneficiaries reached or registered for outreach at this volunteer activity (typically awareness). */
    public function linkedBeneficiaries(): BelongsToMany
    {
        return $this->belongsToMany(Beneficiary::class, 'bf_vol_opp_links')->withTimestamps();
    }
}
