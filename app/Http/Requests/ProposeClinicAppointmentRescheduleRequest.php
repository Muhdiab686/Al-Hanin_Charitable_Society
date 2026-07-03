<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProposeClinicAppointmentRescheduleRequest extends FormRequest
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
            'doctor_id' => ['required', 'exists:users,id'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'proposal_note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
