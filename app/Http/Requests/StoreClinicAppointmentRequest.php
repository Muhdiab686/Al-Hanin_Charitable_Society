<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreClinicAppointmentRequest extends FormRequest
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
            'beneficiary_id' => ['required', 'exists:beneficiaries,id'],
            'doctor_id' => ['required', 'exists:users,id'],
            'scheduled_at' => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
