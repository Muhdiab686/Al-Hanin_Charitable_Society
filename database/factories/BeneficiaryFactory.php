<?php

namespace Database\Factories;

use App\Models\Beneficiary;
use App\Models\Family;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Beneficiary>
 */
class BeneficiaryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'family_id' => Family::factory(),
            'user_id' => null,
            'category_id' => null,
            'national_id' => $this->faker->unique()->numerify('##########'),
            'name' => $this->faker->name(),
            'date_of_birth' => $this->faker->date(),
            'phone' => $this->faker->phoneNumber(),
            'status' => 'active',
            'is_head_of_family' => false,
            'notes' => $this->faker->sentence(),
        ];
    }
}
