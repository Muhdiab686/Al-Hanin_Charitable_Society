<?php

namespace Database\Factories;

use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AidRequest>
 */
class AidRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'beneficiary_id' => Beneficiary::factory(),
            'created_by' => User::factory(),
            'type' => $this->faker->randomElement(['urgent_financial', 'special_item', 'medical_prescription']),
            'requested_amount' => $this->faker->randomFloat(2, 0, 5000),
            'description' => $this->faker->sentence(),
            'status' => 'pending',
            'submitted_at' => now(),
        ];
    }
}
