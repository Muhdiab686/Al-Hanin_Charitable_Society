<?php

namespace Database\Factories;

use App\Models\AidRequest;
use App\Models\ApprovalRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApprovalRequest>
 */
class ApprovalRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'aid_request_id' => AidRequest::factory(),
            'reviewed_by' => null,
            'decision' => 'pending',
            'review_note' => null,
            'reviewed_at' => null,
        ];
    }
}
