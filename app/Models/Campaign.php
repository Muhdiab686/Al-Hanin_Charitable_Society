<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'description',
        'goal_amount',
        'raised_amount',
        'spent_amount',
        'status',
        'starts_at',
        'ends_at',
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
