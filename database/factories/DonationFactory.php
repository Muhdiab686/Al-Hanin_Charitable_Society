<?php

namespace Database\Factories;

use App\Enums\DonationType;
use App\Models\Donation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Donation>
 */
class DonationFactory extends Factory
{
    /**
     * @var class-string<Donation>
     */
    protected $model = Donation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => DonationType::Cash,
            'cash_amount' => $this->faker->randomFloat(2, 10, 5000),
            'donor_name' => $this->faker->name(),
            'donor_phone' => $this->faker->phoneNumber(),
            'notes' => null,
            'receipt_code' => 'DON-'.$this->faker->unique()->numerify('########'),
            'registered_by' => User::factory(),
        ];
    }
}
