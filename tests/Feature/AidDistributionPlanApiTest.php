<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
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
}
