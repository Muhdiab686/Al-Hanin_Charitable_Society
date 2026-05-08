<?php

namespace App\Http\Requests;

use App\Models\AidRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ConfirmAidDeliveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'allocation_ids' => ['required', 'array', 'min:1'],
            'allocation_ids.*' => ['required', 'integer', 'exists:aid_inventory_allocations,id'],
            'delivery_note' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var AidRequest|null $aidRequest */
            $aidRequest = $this->route('aidRequest');

            if ($aidRequest === null) {
                return;
            }

            if ($aidRequest->status !== 'approved') {
                $validator->errors()->add('aid_request', __('Only approved aid requests can be delivered.'));
            }
        });
    }
}
