<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmBeneficiaryAidDeliveryByQrRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
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
            'aid_request_id' => ['nullable', 'integer', 'exists:aid_requests,id'],
            'delivery_note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
