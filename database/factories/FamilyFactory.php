<?php

namespace Database\Factories;

use App\Models\Family;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Family>
 */
class FamilyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'family_code' => 'FAM-'.$this->faker->unique()->numerify('######'),
            'head_name' => $this->faker->name(),
            'phone' => $this->faker->phoneNumber(),
            'address' => $this->faker->address(),
            'members_count' => $this->faker->numberBetween(1, 10),
            'monthly_income' => $this->faker->randomFloat(2, 0, 5000),
        ];
    }
}
