<?php

namespace App\Http\Requests;

use App\Models\AidRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAidInventoryDistributionRequest extends FormRequest
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
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_item_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
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
                $validator->errors()->add(
                    'aid_request',
                    __('Only approved aid requests can receive inventory allocations.')
                );
            }

            if (! in_array($aidRequest->type, ['special_item', 'medical_prescription'], true)) {
                $validator->errors()->add(
                    'aid_request',
                    __('Inventory allocation applies only to non-cash aid request types.')
                );
            }
        });
    }
}
