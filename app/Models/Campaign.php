<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Campaign extends Model
{
    use HasFactory;

    /** Statuses that still accept donations. */
    public const OPEN_STATUSES = ['active'];

    /** Statuses in which accounting invoices may be recorded against the campaign wallet. */
    public const SPENDABLE_STATUSES = ['active', 'completed', 'closed'];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'campaign_code',
        'title',
        'description',
        'goal_amount',
        'raised_amount',
        'spent_amount',
        'status',
        'starts_at',
        'ends_at',
        'published_at',
        'closed_at',
        'image_url',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'goal_amount' => 'decimal:2',
            'raised_amount' => 'decimal:2',
            'spent_amount' => 'decimal:2',
            'starts_at' => 'date',
            'ends_at' => 'date',
            'published_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function donations(): HasMany
    {
        return $this->hasMany(Donation::class);
    }

    public function operationalExpenses(): HasMany
    {
        return $this->hasMany(OperationalExpense::class);
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(CampaignWallet::class);
    }

    public function distributionPlans(): HasMany
    {
        return $this->hasMany(AidDistributionPlan::class);
    }

    public function progressPercentage(): float
    {
        if ((float) $this->goal_amount <= 0) {
            return 0;
        }

        return min(100, round(((float) $this->raised_amount / (float) $this->goal_amount) * 100, 2));
    }

    public function walletBalance(): float
    {
        return round((float) $this->raised_amount - (float) $this->spent_amount, 2);
    }

    public function isOpenForDonations(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    public function isSpendable(): bool
    {
        return in_array($this->status, self::SPENDABLE_STATUSES, true);
    }

    public function shouldAutoComplete(): bool
    {
        $goalReached = (float) $this->goal_amount > 0 && (float) $this->raised_amount >= (float) $this->goal_amount;
        $dateClosed = $this->ends_at !== null && $this->ends_at->isPast();

        return $goalReached || $dateClosed;
    }

    public function autoCompleteIfEligible(): void
    {
        if ($this->status !== 'active') {
            return;
        }

        if ($this->shouldAutoComplete()) {
            $this->forceFill(['status' => 'completed'])->save();
        }
    }
}
