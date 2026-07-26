<?php

namespace App\Http\Requests;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\FamilyRelationship;
<<<<<<< HEAD
use App\Enums\HealthStatus;
=======
use App\Enums\HousingStatus;
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'family.housing_status' => ['required', 'string', Rule::enum(HousingStatus::class)],
            'family.enrollment_status' => [
                'nullable',
                'string',
                Rule::in([FamilyEnrollmentStatus::Draft->value, FamilyEnrollmentStatus::PendingBoard->value]),
            ],

            'beneficiary.national_id' => ['required', 'string', 'max:100', 'unique:beneficiaries,national_id'],
            'beneficiary.name' => ['required', 'string', 'max:255'],
            'beneficiary.date_of_birth' => ['nullable', 'date'],
            'beneficiary.phone' => ['nullable', 'string', 'max:50'],
            'beneficiary.notes' => ['nullable', 'string'],
            'beneficiary.is_head_of_family' => ['nullable', 'boolean'],
            'beneficiary.family_relationship' => ['nullable', 'string', Rule::enum(FamilyRelationship::class)],
            'beneficiary.gender' => ['nullable', 'string', Rule::in(['male', 'female'])],
            'beneficiary.category_id' => ['nullable', 'exists:categories,id'],
            'beneficiary.health_status' => ['nullable', Rule::enum(HealthStatus::class)],
            'beneficiary.health_details' => ['nullable', 'string', 'max:2000'],

            'members' => ['nullable', 'array'],
            'members.*.national_id' => ['required_with:members', 'string', 'max:100', 'unique:beneficiaries,national_id'],
            'members.*.name' => ['required_with:members', 'string', 'max:255'],
            'members.*.family_relationship' => ['required_with:members', 'string', Rule::enum(FamilyRelationship::class)],
            'members.*.date_of_birth' => ['nullable', 'date'],
            'members.*.phone' => ['nullable', 'string', 'max:50'],
            'members.*.gender' => ['nullable', 'string', Rule::in(['male', 'female'])],
            'members.*.health_status' => ['nullable', Rule::enum(HealthStatus::class)],
            'members.*.health_details' => ['nullable', 'string', 'max:2000'],
            'members.*.notes' => ['nullable', 'string'],
            'members.*.category_id' => ['nullable', 'exists:categories,id'],
        ];
    }
}
