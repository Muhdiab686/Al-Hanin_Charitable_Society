<?php

namespace App\Http\Requests;

use App\Enums\FamilyEnrollmentStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFamilyEnrollmentStatusRequest extends FormRequest
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
            'enrollment_status' => [
                'required',
                'string',
                Rule::enum(FamilyEnrollmentStatus::class),
            ],
        ];
    }
}
