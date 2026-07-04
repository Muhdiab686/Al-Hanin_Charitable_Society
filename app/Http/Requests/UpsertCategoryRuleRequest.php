<?php

namespace App\Http\Requests;

use App\Enums\HousingStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'requires_health_condition' => ['sometimes', 'boolean'],
            'min_newborns' => ['nullable', 'integer', 'min:1'],
            'housing_statuses' => ['nullable', 'array'],
            'housing_statuses.*' => ['string', Rule::enum(HousingStatus::class)],
            'min_children_under_18' => ['nullable', 'integer', 'min:0'],
            'min_adults' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
