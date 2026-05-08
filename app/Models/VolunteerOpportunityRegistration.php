<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VolunteerOpportunityRegistration extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'volunteer_opportunity_id',
        'user_id',
        'registered_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'registered_at' => 'datetime',
        ];
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(VolunteerOpportunity::class, 'volunteer_opportunity_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
