<?php

namespace App\Http\Requests;

use App\Enums\HousingStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFamilyProfileRequest extends FormRequest
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
            'head_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'members_count' => ['sometimes', 'integer', 'min:1'],
            'monthly_income' => ['sometimes', 'numeric', 'min:0'],
            'housing_status' => ['sometimes', 'nullable', 'string', Rule::enum(HousingStatus::class)],
        ];
    }
}
