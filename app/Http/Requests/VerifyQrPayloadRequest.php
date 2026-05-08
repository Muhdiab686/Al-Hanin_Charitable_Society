<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class VerifyQrPayloadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Payload format: hanin:{uuid}.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'payload' => [
                'required',
                'string',
                'max:512',
                'regex:/^hanin:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/',
            ],
        ];
    }
}
