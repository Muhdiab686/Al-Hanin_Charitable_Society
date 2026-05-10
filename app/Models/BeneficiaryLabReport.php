<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BeneficiaryLabReport extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'beneficiary_id',
        'uploaded_by',
        'title',
        'findings',
        'attachment_path',
        'attachment_original_name',
    ];

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
