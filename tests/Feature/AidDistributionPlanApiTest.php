<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\AidDistributionPlan;
use App\Models\Beneficiary;
use App\Models\Campaign;
use App\Models\Family;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AidDistributionPlanApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_storekeeper_can_create_equal_units_distribution_plan(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $familyA = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        $familyB = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        Beneficiary::factory()->create(['family_id' => $familyA->id, 'is_head_of_family' => true]);
        Beneficiary::factory()->create(['family_id' => $familyB->id, 'is_head_of_family' => true]);

        $response = $this->postJson('/api/v1/aid-distribution-plans', [
            'title' => 'Monthly food batch',
            'aid_type' => 'special_item',
            'distribution_date' => now()->toDateString(),
            'total_units' => 5,
        ], [
            'Authorization' => 'Bearer '.$storekeeper->createToken('sk')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonPath('plan.eligible_families_count', 2)
            ->assertJsonCount(2, 'plan.lines');
    }

    public function test_financial_plan_splits_amount_equally_with_remainder(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $familyA = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        $familyB = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        $familyC = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);

        Beneficiary::factory()->create(['family_id' => $familyA->id]);
        Beneficiary::factory()->create(['family_id' => $familyB->id]);
        Beneficiary::factory()->create(['family_id' => $familyC->id]);

        $response = $this->postJson('/api/v1/aid-distribution-plans', [
            'title' => 'Emergency cash support',
            'aid_type' => 'urgent_financial',
            'distribution_date' => now()->toDateString(),
            'total_amount' => 100,
        ], [
            'Authorization' => 'Bearer '.$storekeeper->createToken('sk2')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonCount(3, 'plan.lines');

        $amounts = collect($response->json('plan.lines'))->pluck('allocated_amount')->map(fn ($a) => (float) $a);
        $this->assertEquals(100.0, round($amounts->sum(), 2));
    }

    public function test_paused_or_non_approved_families_are_excluded_from_plan(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $eligible = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'has_direct_income' => false,
            'aid_paused_at' => null,
        ]);
        $paused = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'has_direct_income' => true,
            'aid_paused_at' => now(),
        ]);
        $pending = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::PendingBoard,
        ]);

        Beneficiary::factory()->create(['family_id' => $eligible->id]);
        Beneficiary::factory()->create(['family_id' => $paused->id]);
        Beneficiary::factory()->create(['family_id' => $pending->id]);

        $response = $this->postJson('/api/v1/aid-distribution-plans', [
            'title' => 'Eligible only plan',
            'aid_type' => 'medical_prescription',
            'distribution_date' => now()->toDateString(),
            'total_units' => 10,
        ], [
            'Authorization' => 'Bearer '.$storekeeper->createToken('sk3')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonPath('plan.eligible_families_count', 1)
            ->assertJsonCount(1, 'plan.lines');
    }

    public function test_plan_filter_can_prioritize_children_under_18_health_and_housing_status(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $highPriorityFamily = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'has_direct_income' => false,
            'housing_status' => 'rent',
        ]);
        $lowPriorityFamily = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'has_direct_income' => false,
            'housing_status' => 'owned',
        ]);

        Beneficiary::factory()->create([
            'family_id' => $highPriorityFamily->id,
            'family_relationship' => 'child',
            'age' => 12,
            'health_status' => 'critical',
        ]);
        Beneficiary::factory()->create([
            'family_id' => $highPriorityFamily->id,
            'family_relationship' => 'mother',
            'age' => 33,
            'health_status' => 'stable',
        ]);

        Beneficiary::factory()->create([
            'family_id' => $lowPriorityFamily->id,
            'family_relationship' => 'child',
            'age' => 19,
            'health_status' => 'good',
        ]);
        Beneficiary::factory()->create([
            'family_id' => $lowPriorityFamily->id,
            'family_relationship' => 'father',
            'age' => 45,
            'health_status' => 'good',
        ]);

        $response = $this->postJson('/api/v1/aid-distribution-plans', [
            'title' => 'Smart filter plan',
            'aid_type' => 'special_item',
            'distribution_date' => now()->toDateString(),
            'distribution_frequency' => 'quarterly',
            'total_units' => 12,
            'filter_criteria' => [
                'min_children_under_18' => 1,
                'health_priority_only' => true,
                'housing_statuses' => ['rent'],
            ],
        ], [
            'Authorization' => 'Bearer '.$storekeeper->createToken('sk4')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonPath('plan.eligible_families_count', 1)
            ->assertJsonPath('plan.distribution_frequency', 'quarterly')
            ->assertJsonPath('plan.cycles_per_year', 4)
            ->assertJsonPath('plan.projected_annual_units', 48)
            ->assertJsonCount(1, 'plan.lines');
    }

    public function test_food_basket_plan_auto_units_equals_selected_families_count(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $familyA = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'has_direct_income' => false,
        ]);
        $familyB = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'has_direct_income' => false,
        ]);

        Beneficiary::factory()->create(['family_id' => $familyA->id]);
        Beneficiary::factory()->create(['family_id' => $familyB->id]);

        $response = $this->postJson('/api/v1/aid-distribution-plans', [
            'title' => 'Food basket quarterly plan',
            'aid_type' => 'food_basket',
            'distribution_date' => now()->toDateString(),
            'distribution_frequency' => 'quarterly',
            'auto_units' => true,
            'selected_family_ids' => [$familyA->id, $familyB->id],
        ], [
            'Authorization' => 'Bearer '.$storekeeper->createToken('sk-auto')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonPath('plan.aid_type', 'food_basket')
            ->assertJsonPath('plan.eligible_families_count', 2)
            ->assertJsonPath('plan.total_units', 2)
            ->assertJsonPath('plan.projected_annual_units', 8)
            ->assertJsonCount(2, 'plan.lines');
    }

    public function test_storekeeper_can_mark_plan_cycle_as_completed(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $plan = AidDistributionPlan::query()->create([
            'title' => 'Quarterly food plan',
            'aid_type' => 'special_item',
            'distribution_date' => now()->toDateString(),
            'distribution_frequency' => 'quarterly',
            'cycles_per_year' => 4,
            'eligible_families_count' => 2,
            'total_units' => 20,
            'projected_annual_units' => 80,
            'status' => 'draft',
            'completed_cycles' => 0,
            'created_by' => $storekeeper->id,
        ]);

        $response = $this->patchJson("/api/v1/aid-distribution-plans/{$plan->id}/complete-cycle", [], [
            'Authorization' => 'Bearer '.$storekeeper->createToken('sk5')->plainTextToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('plan.completed_cycles', 1)
            ->assertJsonPath('plan.status', 'in_progress');
    }

    public function test_completed_plan_cycle_does_not_exceed_cycles_per_year(): void
    {
        $storekeeper = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $storekeeper->syncRoles([UserRole::Storekeeper->value]);

        $plan = AidDistributionPlan::query()->create([
            'title' => 'Annual school kits plan',
            'aid_type' => 'special_item',
            'distribution_date' => now()->toDateString(),
            'distribution_frequency' => 'yearly',
            'cycles_per_year' => 1,
            'eligible_families_count' => 1,
            'total_units' => 10,
            'projected_annual_units' => 10,
            'status' => 'in_progress',
            'completed_cycles' => 1,
            'created_by' => $storekeeper->id,
        ]);

        $response = $this->patchJson("/api/v1/aid-distribution-plans/{$plan->id}/complete-cycle", [], [
            'Authorization' => 'Bearer '.$storekeeper->createToken('sk6')->plainTextToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('plan.completed_cycles', 1)
            ->assertJsonPath('plan.status', 'completed');
    }

    public function test_secretary_can_preview_candidate_families_without_creating_plan(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $secretary->syncRoles([UserRole::RecordingSecretary->value]);

        $family = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        Beneficiary::factory()->create(['family_id' => $family->id, 'is_head_of_family' => true]);

        $response = $this->postJson('/api/v1/aid-distribution-plans/candidates', [
            'filter_criteria' => [],
        ], [
            'Authorization' => 'Bearer '.$secretary->createToken('preview')->plainTextToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('families.0.family_id', $family->id);

        $this->assertDatabaseCount('aid_distribution_plans', 0);
    }

    public function test_secretary_can_create_plan_with_manually_selected_families_only(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $secretary->syncRoles([UserRole::RecordingSecretary->value]);

        $familyA = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        $familyB = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        Beneficiary::factory()->create(['family_id' => $familyA->id, 'is_head_of_family' => true]);
        Beneficiary::factory()->create(['family_id' => $familyB->id, 'is_head_of_family' => true]);

        $response = $this->postJson('/api/v1/aid-distribution-plans', [
            'title' => 'Hand-picked plan',
            'aid_type' => 'special_item',
            'distribution_date' => now()->toDateString(),
            'total_units' => 10,
            'selected_family_ids' => [$familyA->id],
        ], [
            'Authorization' => 'Bearer '.$secretary->createToken('manual-select')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonPath('plan.eligible_families_count', 1)
            ->assertJsonCount(1, 'plan.lines')
            ->assertJsonPath('plan.lines.0.family_id', $familyA->id);
    }

    public function test_recording_secretary_can_link_distribution_plan_to_campaign(): void
    {
        $recordingSecretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $recordingSecretary->syncRoles([UserRole::RecordingSecretary->value]);

        $family = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        Beneficiary::factory()->create(['family_id' => $family->id, 'is_head_of_family' => true]);

        $campaign = Campaign::query()->create([
            'title' => 'Winter warmth',
            'goal_amount' => 1000,
            'raised_amount' => 0,
            'spent_amount' => 0,
            'status' => 'active',
            'created_by' => $recordingSecretary->id,
        ]);

        $response = $this->postJson('/api/v1/aid-distribution-plans', [
            'title' => 'Campaign-linked plan',
            'aid_type' => 'special_item',
            'campaign_id' => $campaign->id,
            'distribution_date' => now()->toDateString(),
            'total_units' => 10,
        ], [
            'Authorization' => 'Bearer '.$recordingSecretary->createToken('rs-plan')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonPath('plan.campaign.id', $campaign->id)
            ->assertJsonPath('plan.campaign.title', 'Winter warmth');
    }
}
