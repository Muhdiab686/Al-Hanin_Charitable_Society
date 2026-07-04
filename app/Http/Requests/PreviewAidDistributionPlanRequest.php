<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PreviewAidDistributionPlanRequest extends FormRequest
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
            'filter_criteria' => ['nullable', 'array'],
            'filter_criteria.min_children' => ['nullable', 'integer', 'min:0'],
            'filter_criteria.min_children_under_18' => ['nullable', 'integer', 'min:0'],
            'filter_criteria.min_adults' => ['nullable', 'integer', 'min:0'],
            'filter_criteria.min_school_age_children' => ['nullable', 'integer', 'min:0'],
            'filter_criteria.min_family_members' => ['nullable', 'integer', 'min:1'],
            'filter_criteria.max_monthly_income' => ['nullable', 'numeric', 'min:0'],
            'filter_criteria.health_priority_only' => ['nullable', 'boolean'],
            'filter_criteria.housing_statuses' => ['nullable', 'array'],
            'filter_criteria.housing_statuses.*' => ['string', 'max:100'],
            'filter_criteria.urgent_need' => ['nullable', 'string', 'max:100'],
        ];
    }
}
