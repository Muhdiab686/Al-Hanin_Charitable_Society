<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SyncVolunteerOpportunityLinkedBeneficiariesRequest extends FormRequest
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
            'beneficiary_ids' => ['required', 'array'],
            'beneficiary_ids.*' => ['integer', 'distinct', 'exists:beneficiaries,id'],
        ];
    }
}
