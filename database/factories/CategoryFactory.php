<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->randomElement(['extreme_poverty', 'orphans', 'disability', 'medical_critical']),
            'priority' => $this->faker->numberBetween(1, 5),
            'description' => $this->faker->sentence(),
        ];
    }
}
