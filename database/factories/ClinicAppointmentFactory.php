<?php

namespace Database\Factories;

use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClinicAppointment>
 */
class ClinicAppointmentFactory extends Factory
{
    /**
     * @var class-string<ClinicAppointment>
     */
    protected $model = ClinicAppointment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $creator = User::factory();

        return [
            'beneficiary_id' => Beneficiary::factory(),
            'doctor_id' => User::factory(),
            'created_by' => $creator,
            'scheduled_at' => $this->faker->dateTimeBetween('-1 day', '+5 days'),
            'status' => 'scheduled',
            'reason' => null,
            'cancelled_at' => null,
            'cancellation_reason' => null,
        ];
    }
}
