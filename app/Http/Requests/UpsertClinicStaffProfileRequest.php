<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertClinicStaffProfileRequest extends FormRequest
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
            'user_id' => ['required', 'exists:users,id'],
            'monthly_salary' => ['required', 'numeric', 'min:0'],
            'consultation_fee' => ['required', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'role' => ['required', Rule::in(['doctor', 'secretary'])],
        ];
    }
}
