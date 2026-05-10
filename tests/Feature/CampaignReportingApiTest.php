<?php

namespace Tests\Feature;

use App\Enums\DonationType;
use App\Enums\UserRole;
use App\Enums\VolunteerActivityKind;
use App\Models\Beneficiary;
use App\Models\Donation;
use App\Models\Family;
use App\Models\User;
use App\Models\VolunteerOpportunity;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignReportingApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_volunteer_cannot_access_campaign_reporting(): void
    {
        $user = User::factory()->create(['role' => UserRole::Volunteer->value]);
        $user->syncRoles([UserRole::Volunteer->value]);

        $this->getJson('/api/v1/reporting/campaigns', [
            'Authorization' => 'Bearer '.$user->createToken('t')->plainTextToken,
        ])->assertForbidden();
    }

    public function test_accountant_receives_campaign_reporting_payload(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);

        Donation::factory()->create([
            'type' => DonationType::Cash,
            'cash_amount' => 350.50,
            'purpose' => 'حملة اختبار صغيرة',
            'registered_by' => $accountant->id,
        ]);

        $response = $this->getJson('/api/v1/reporting/campaigns', [
            'Authorization' => 'Bearer '.$accountant->createToken('t')->plainTextToken,
        ]);

        $response->assertOk()->assertJsonPath('_kind', 'campaign_reporting');
        $cash = collect($response->json('cash_by_campaign_tag'));

        self::assertTrue($cash->pluck('key')->contains('حملة اختبار صغيرة'));
        self::assertEquals(350.50, round((float) $cash->firstWhere('key', 'حملة اختبار صغيرة')['total_cash'], 2));
    }

    public function test_secretary_can_sync_linked_beneficiaries_for_awareness_only(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $family = Family::factory()->create();
        $beneficiaryIds = Beneficiary::factory()
            ->count(2)
            ->create(['family_id' => $family->id])
            ->pluck('id')
            ->all();

        $awareness = VolunteerOpportunity::factory()->create([
            'activity_kind' => VolunteerActivityKind::Awareness,
            'created_by' => $secretary->id,
        ]);

        $this->patchJson(
            '/api/v1/volunteer-opportunities/'.$awareness->id.'/linked-beneficiaries',
            ['beneficiary_ids' => $beneficiaryIds],
            ['Authorization' => 'Bearer '.$secretary->createToken('t')->plainTextToken],
        )
            ->assertOk()
            ->assertJsonPath(
                'linked_beneficiary_ids',
                collect($beneficiaryIds)->sort()->values()->all(),
            );

        $this->getJson('/api/v1/reporting/campaigns', [
            'Authorization' => 'Bearer '.$secretary->createToken('t')->plainTextToken,
        ])
            ->assertOk()
            ->assertJsonFragment(['linked_beneficiaries_count' => 2]);
    }

    public function test_donor_can_access_campaign_reporting(): void
    {
        $donor = User::factory()->create(['role' => UserRole::Donor->value]);
        $donor->syncRoles([UserRole::Donor->value]);

        Donation::factory()->create([
            'type' => DonationType::Cash,
            'cash_amount' => 120,
            'purpose' => 'حملة متبرعين عامة',
            'registered_by' => $donor->id,
        ]);

        $this->getJson('/api/v1/reporting/campaigns', [
            'Authorization' => 'Bearer '.$donor->createToken('t')->plainTextToken,
        ])->assertOk()->assertJsonPath('_kind', 'campaign_reporting');
    }

    public function test_secretary_cannot_sync_linked_beneficiaries_for_general_activity(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $family = Family::factory()->create();
        $b = Beneficiary::factory()->create(['family_id' => $family->id]);

        $general = VolunteerOpportunity::factory()->create([
            'activity_kind' => VolunteerActivityKind::General,
            'created_by' => $secretary->id,
        ]);

        $this->patchJson(
            '/api/v1/volunteer-opportunities/'.$general->id.'/linked-beneficiaries',
            ['beneficiary_ids' => [$b->id]],
            ['Authorization' => 'Bearer '.$secretary->createToken('t')->plainTextToken],
        )->assertUnprocessable();
    }
}
