<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreBeneficiaryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'family.head_name' => ['required', 'string', 'max:255'],
            'family.phone' => ['nullable', 'string', 'max:50'],
            'family.address' => ['nullable', 'string', 'max:500'],
            'family.members_count' => ['required', 'integer', 'min:1'],
            'family.monthly_income' => ['nullable', 'numeric', 'min:0'],

            'beneficiary.national_id' => ['required', 'string', 'max:100', 'unique:beneficiaries,national_id'],
            'beneficiary.name' => ['required', 'string', 'max:255'],
            'beneficiary.date_of_birth' => ['nullable', 'date'],
            'beneficiary.phone' => ['nullable', 'string', 'max:50'],
            'beneficiary.notes' => ['nullable', 'string'],
            'beneficiary.is_head_of_family' => ['nullable', 'boolean'],
            'beneficiary.category_id' => ['nullable', 'exists:categories,id'],
        ];
    }
}
