<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBeneficiaryProfileRequest extends FormRequest
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
        $beneficiary = $this->route('beneficiary');

        return [
            'national_id' => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('beneficiaries', 'national_id')->ignore($beneficiary?->id),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'date_of_birth' => ['sometimes', 'nullable', 'date'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'is_head_of_family' => ['sometimes', 'boolean'],
        ];
    }
}
