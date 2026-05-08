<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpsertCategoryRuleRequest extends FormRequest
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
            'max_monthly_income' => ['nullable', 'numeric', 'min:0'],
            'min_family_members' => ['nullable', 'integer', 'min:1'],
            'requires_medical_case' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
