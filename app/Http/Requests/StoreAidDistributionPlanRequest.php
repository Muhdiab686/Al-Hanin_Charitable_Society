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
            'aid_type' => ['required', Rule::in(['urgent_financial', 'special_item', 'medical_prescription', 'food_basket', 'stationery', 'surgery'])],
            'item_label' => ['nullable', 'string', 'max:255'],
            'campaign_id' => ['nullable', 'integer', 'exists:campaigns,id'],
            'distribution_date' => ['required', 'date'],
            'distribution_frequency' => ['nullable', Rule::in(['once', 'quarterly', 'yearly'])],
            'auto_units' => ['nullable', 'boolean'],
            'total_amount' => ['nullable', 'numeric', 'min:0.01'],
            'total_units' => ['nullable', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:1000'],
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
            'selected_family_ids' => ['nullable', 'array', 'min:1'],
            'selected_family_ids.*' => ['integer', 'exists:families,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $aidType = (string) $this->input('aid_type');
            $autoUnits = filter_var($this->input('auto_units'), FILTER_VALIDATE_BOOLEAN);

            if ($aidType === 'urgent_financial' && ! $this->filled('total_amount')) {
                $validator->errors()->add('total_amount', __('Total amount is required for financial plans.'));
            }

            if (in_array($aidType, ['special_item', 'medical_prescription'], true) && ! $this->filled('total_units')) {
                $validator->errors()->add('total_units', __('Total units are required for item-based plans.'));
            }
        });
    }
}
