<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategoryRule extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'category_id',
        'max_monthly_income',
        'min_family_members',
        'requires_medical_case',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'max_monthly_income' => 'decimal:2',
            'requires_medical_case' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
