<?php

namespace App\Http\Requests\Beneficiary;

use Illuminate\Foundation\Http\FormRequest;

class OnboardBeneficiaryRequest extends FormRequest
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
            'family.head_name' => ['required', 'string', 'max:255'],
            'family.full_family_name' => ['nullable', 'string', 'max:255'],
            'family.phone' => ['nullable', 'string', 'max:50'],
            'family.province' => ['nullable', 'string', 'max:100'],
            'family.city' => ['nullable', 'string', 'max:100'],
            'family.neighborhood' => ['nullable', 'string', 'max:100'],
            'family.address' => ['nullable', 'string', 'max:500'],
            'family.members_count' => ['nullable', 'integer', 'min:1'],
            'family.monthly_income' => ['nullable', 'numeric', 'min:0'],

            'head.name' => ['nullable', 'string', 'max:255'],
            'head.national_id' => ['nullable', 'string', 'max:100'],
            'head.phone' => ['nullable', 'string', 'max:50'],
            'head.date_of_birth' => ['nullable', 'date'],
            'head.gender' => ['nullable', 'string', 'in:male,female'],
        ];
    }
}
