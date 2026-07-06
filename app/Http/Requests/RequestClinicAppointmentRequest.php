<?php

namespace App\Http\Requests;

use App\Enums\MedicalSpecialty;
use App\Models\ClinicStaffProfile;
use App\Services\DoctorAppointmentAvailabilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

class RequestClinicAppointmentRequest extends FormRequest
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
            'requested_specialty' => ['required', 'string', Rule::enum(MedicalSpecialty::class)],
            'reason' => ['nullable', 'string', 'max:1000'],
            'preferred_date' => ['required', 'date', 'after_or_equal:today'],
            'preferred_time' => ['required', 'date_format:H:i'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $doctorProfile = ClinicStaffProfile::query()
                ->where('user_id', (int) $this->input('doctor_id'))
                ->where('is_active', true)
                ->first();

            if ($doctorProfile === null) {
                $validator->errors()->add('doctor_id', __('The selected doctor is not active in clinic staff.'));

                return;
            }

            if ($doctorProfile->specialty !== null && $doctorProfile->specialty !== $this->input('requested_specialty')) {
                $validator->errors()->add('doctor_id', __('The selected doctor does not match the requested specialty.'));

                return;
            }

            $scheduledAt = Carbon::parse(
                (string) $this->input('preferred_date').' '.(string) $this->input('preferred_time')
            );

            try {
                app(DoctorAppointmentAvailabilityService::class)->assertDoctorAvailableOnDate($doctorProfile, $scheduledAt);
                app(DoctorAppointmentAvailabilityService::class)->assertNoDoctorConflict(
                    (int) $this->input('doctor_id'),
                    $scheduledAt,
                );
            } catch (ValidationException $exception) {
                foreach ($exception->errors() as $field => $messages) {
                    foreach ($messages as $message) {
                        $validator->errors()->add($field, $message);
                    }
                }
            }
        });
    }
}
