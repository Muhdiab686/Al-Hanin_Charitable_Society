<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAidDistributionPlanRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'aid_type' => ['required', Rule::in(['urgent_financial', 'special_item', 'medical_prescription'])],
            'distribution_date' => ['required', 'date'],
            'total_amount' => ['nullable', 'numeric', 'min:0.01'],
            'total_units' => ['nullable', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $aidType = (string) $this->input('aid_type');

            if ($aidType === 'urgent_financial' && ! $this->filled('total_amount')) {
                $validator->errors()->add('total_amount', __('Total amount is required for financial plans.'));
            }

            if (in_array($aidType, ['special_item', 'medical_prescription'], true) && ! $this->filled('total_units')) {
                $validator->errors()->add('total_units', __('Total units are required for item-based plans.'));
            }
        });
    }
}
