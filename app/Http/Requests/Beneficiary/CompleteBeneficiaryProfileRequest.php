<?php

namespace App\Http\Requests\Beneficiary;

use App\Enums\EducationLevel;
use App\Enums\EmploymentStatus;
use App\Enums\FamilyRelationship;
use App\Enums\HealthStatus;
use App\Enums\HousingStatus;
use App\Enums\MaritalStatus;
use App\Enums\OrphanStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompleteBeneficiaryProfileRequest extends FormRequest
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
            'family.full_family_name' => ['required', 'string', 'max:255'],
            'family.head_name' => ['required', 'string', 'max:255'],
            'family.phone' => ['required', 'string', 'max:50'],
            'family.province' => ['required', 'string', 'max:100'],
            'family.city' => ['required', 'string', 'max:100'],
            'family.neighborhood' => ['required', 'string', 'max:100'],
            'family.address' => ['nullable', 'string', 'max:500'],
            'family.housing_status' => ['required', 'string', Rule::enum(HousingStatus::class)],
            'family.total_monthly_income' => ['required', 'numeric', 'min:0'],
            'family.previous_charity_aid' => ['nullable', 'array'],
            'family.previous_charity_aid.received' => ['nullable', 'boolean'],
            'family.previous_charity_aid.charity_name' => ['nullable', 'string', 'max:255'],
            'family.previous_charity_aid.aid_type' => ['nullable', 'string', 'max:255'],
            'family.urgent_needs' => ['nullable', 'array'],
            'family.urgent_needs.*' => ['string', 'max:100'],

            'members' => ['required', 'array', 'min:1'],
            'members.*.id' => ['nullable', 'integer', 'exists:beneficiaries,id'],
            'members.*.name' => ['required', 'string', 'max:255'],
            'members.*.national_id' => ['nullable', 'string', 'max:100'],
            'members.*.family_relationship' => ['required', 'string', Rule::enum(FamilyRelationship::class)],
            'members.*.date_of_birth' => ['nullable', 'date'],
            'members.*.age' => ['nullable', 'integer', 'min:0', 'max:120'],
            'members.*.gender' => ['nullable', 'string', Rule::in(['male', 'female'])],
            'members.*.phone' => ['nullable', 'string', 'max:50'],
            'members.*.additional_phone' => ['nullable', 'string', 'max:50'],
            'members.*.marital_status' => ['nullable', 'string', Rule::enum(MaritalStatus::class)],
            'members.*.education_level' => ['nullable', 'string', Rule::enum(EducationLevel::class)],
            'members.*.employment_status' => ['nullable', 'string', Rule::enum(EmploymentStatus::class)],
            'members.*.profession' => ['nullable', 'string', 'max:255'],
            'members.*.workplace' => ['nullable', 'string', 'max:255'],
            'members.*.income_type' => ['nullable', 'string', Rule::in('fixed', 'variable')],
            'members.*.monthly_income' => ['nullable', 'numeric', 'min:0'],
            'members.*.health_status' => ['nullable', 'string', Rule::enum(HealthStatus::class)],
            'members.*.health_details' => ['nullable', 'string', 'max:1000'],
            'members.*.is_housewife' => ['nullable', 'boolean'],
            'members.*.kinship_degree' => ['nullable', 'string', 'max:100'],
            'members.*.orphan_status' => ['nullable', 'string', Rule::enum(OrphanStatus::class)],
            'members.*.notes' => ['nullable', 'string'],
        ];
    }
}
