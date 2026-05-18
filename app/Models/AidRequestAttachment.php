<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AidRequestAttachment extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'aid_request_id',
        'path',
        'original_name',
        'mime_type',
        'size_bytes',
    ];

    public function aidRequest(): BelongsTo
    {
        return $this->belongsTo(AidRequest::class);
    }
}
