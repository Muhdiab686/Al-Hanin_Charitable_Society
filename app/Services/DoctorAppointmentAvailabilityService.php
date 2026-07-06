<?php

namespace App\Services;

use App\Models\ClinicAppointment;
use App\Models\ClinicStaffProfile;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class DoctorAppointmentAvailabilityService
{
    /**
     * @param  list<string>  $availableDays
     */
    public function isDateOnAvailableDays(Carbon $date, array $availableDays): bool
    {
        if ($availableDays === []) {
            return true;
        }

        $weekday = $date->format('l');

        return in_array($weekday, $availableDays, true);
    }

    public function assertDoctorAvailableOnDate(
        ClinicStaffProfile $profile,
        Carbon $scheduledAt,
        string $errorField = 'preferred_date',
    ): void {
        $availableDays = $profile->available_days ?? [];

        if ($availableDays === []) {
            return;
        }

        if (! $this->isDateOnAvailableDays($scheduledAt, $availableDays)) {
            throw ValidationException::withMessages([
                $errorField => [__('The selected date is not on the doctor\'s available days.')],
            ]);
        }
    }

    public function assertNoDoctorConflict(int $doctorId, Carbon $scheduledAt, ?int $excludeAppointmentId = null): void
    {
        $hourStart = $scheduledAt->copy()->startOfHour();
        $hourEnd = $scheduledAt->copy()->endOfHour();

        $conflictExists = ClinicAppointment::query()
            ->where('doctor_id', $doctorId)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('scheduled_at', [$hourStart, $hourEnd])
            ->when($excludeAppointmentId !== null, fn ($query) => $query->where('id', '!=', $excludeAppointmentId))
            ->exists();

        if ($conflictExists) {
            throw ValidationException::withMessages([
                'scheduled_at' => [__('This doctor already has an appointment at the same hour.')],
            ]);
        }
    }
}
