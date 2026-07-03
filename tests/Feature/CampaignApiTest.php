<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Campaign;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_recording_secretary_can_create_campaign(): void
    {
        $recordingSecretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $recordingSecretary->syncRoles([UserRole::RecordingSecretary->value]);

        $response = $this->postJson('/api/v1/campaigns', [
            'title' => 'دفئ الشتاء',
            'description' => 'ساهم في تدفئة 100 أسرة',
            'goal_amount' => 5000,
            'status' => 'active',
            'ends_at' => now()->addDays(20)->toDateString(),
        ], [
            'Authorization' => 'Bearer '.$recordingSecretary->createToken('rs-campaign')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonPath('campaign.title', 'دفئ الشتاء')
            ->assertJsonPath('campaign.goal_amount', '5000.00');
    }

    public function test_campaign_auto_completes_when_goal_reached_on_listing(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);

        $campaign = Campaign::query()->create([
            'title' => 'Goal campaign',
            'goal_amount' => 100,
            'raised_amount' => 100,
            'spent_amount' => 0,
            'status' => 'active',
            'created_by' => $admin->id,
        ]);

        $this->getJson('/api/v1/campaigns', [
            'Authorization' => 'Bearer '.$admin->createToken('admin-campaigns')->plainTextToken,
        ])->assertOk();

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'status' => 'completed',
        ]);
    }

    public function test_donor_public_campaigns_hide_campaigns_closed_by_date(): void
    {
        $creator = User::factory()->create(['role' => UserRole::Admin->value]);
        $creator->syncRoles([UserRole::Admin->value]);
        $donor = User::factory()->create(['role' => UserRole::Donor->value]);
        $donor->syncRoles([UserRole::Donor->value]);

        Campaign::query()->create([
            'title' => 'Expired campaign',
            'goal_amount' => 200,
            'raised_amount' => 20,
            'spent_amount' => 0,
            'status' => 'active',
            'ends_at' => now()->subDay()->toDateString(),
            'created_by' => $creator->id,
        ]);

        $response = $this->getJson('/api/v1/donor/campaigns', [
            'Authorization' => 'Bearer '.$donor->createToken('donor-campaigns')->plainTextToken,
        ]);

        $response->assertOk()->assertJsonCount(0, 'campaigns');
    }

    public function test_cash_donation_completes_campaign_when_goal_is_met(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);

        $campaign = Campaign::query()->create([
            'title' => 'Closing campaign',
            'goal_amount' => 100,
            'raised_amount' => 70,
            'spent_amount' => 0,
            'status' => 'active',
            'created_by' => $accountant->id,
        ]);

        $this->postJson('/api/v1/donations', [
            'type' => 'cash',
            'cash_amount' => 30,
            'channel' => 'web',
            'campaign_id' => $campaign->id,
            'donor_name' => 'Goal donor',
        ], [
            'Authorization' => 'Bearer '.$accountant->createToken('acc-donate')->plainTextToken,
        ])->assertCreated();

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'raised_amount' => 100,
            'status' => 'completed',
        ]);
    }
}
