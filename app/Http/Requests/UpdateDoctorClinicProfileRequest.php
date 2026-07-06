<?php

namespace App\Http\Requests;

use App\Enums\MedicalSpecialty;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDoctorClinicProfileRequest extends FormRequest
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
            'specialty' => ['required', 'string', Rule::enum(MedicalSpecialty::class)],
            'bio' => ['nullable', 'string', 'max:2000'],
            'consultation_fee' => ['required', 'numeric', 'min:0'],
            'available_days' => ['required', 'array', 'min:1'],
            'available_days.*' => ['required', 'string', 'max:20'],
        ];
    }
}
