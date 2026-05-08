<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreMedicalRecordRequest extends FormRequest
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
            'clinic_appointment_id' => ['required', 'exists:clinic_appointments,id'],
            'diagnosis' => ['required', 'string'],
            'tests_result' => ['nullable', 'string'],
            'prescription' => ['nullable', 'string'],
            'prescription_cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
