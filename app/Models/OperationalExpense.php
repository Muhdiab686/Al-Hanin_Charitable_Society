<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class OperationalExpense extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'invoice_reference',
        'vendor',
        'notes',
    ];

    /**
     * @return MorphMany<FinancialTransaction, $this>
     */
    public function financialTransactions(): MorphMany
    {
        return $this->morphMany(FinancialTransaction::class, 'reference');
    }
}
