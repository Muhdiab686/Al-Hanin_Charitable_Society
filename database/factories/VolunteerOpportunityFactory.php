<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\VolunteerOpportunity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VolunteerOpportunity>
 */
class VolunteerOpportunityFactory extends Factory
{
    /**
     * @var class-string<VolunteerOpportunity>
     */
    protected $model = VolunteerOpportunity::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->sentence(),
            'required_slots' => $this->faker->numberBetween(1, 10),
            'filled_slots' => 0,
            'starts_at' => $this->faker->dateTimeBetween('+1 day', '+10 days'),
            'ends_at' => $this->faker->dateTimeBetween('+11 days', '+20 days'),
            'status' => 'open',
            'created_by' => User::factory(),
        ];
    }
}
