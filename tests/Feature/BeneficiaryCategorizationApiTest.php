<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\Category;
use App\Models\Family;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BeneficiaryCategorizationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_beneficiary_is_auto_classified_on_create(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $secretary->syncRoles([UserRole::RecordingSecretary->value]);

        $response = $this->postJson('/api/v1/beneficiaries', [
            'family' => [
                'head_name' => 'Family Head',
                'members_count' => 6,
                'monthly_income' => 120,
                'enrollment_status' => 'pending_board',
            ],
            'beneficiary' => [
                'national_id' => '44556677889',
                'name' => 'Beneficiary A',
            ],
        ], [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ]);

        $response->assertCreated();
        $categoryName = $response->json('beneficiary.category.name');
        $this->assertSame('financial', $categoryName);
    }

    public function test_updating_family_profile_recalculates_category(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $secretary->syncRoles([UserRole::RecordingSecretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'members_count' => 3,
            'monthly_income' => 120,
        ]);

        $beneficiary = Beneficiary::factory()->create([
            'family_id' => $family->id,
            'category_id' => Category::query()->where('name', 'financial')->firstOrFail()->id,
        ]);

        $this->patchJson('/api/v1/families/'.$family->id, [
            'members_count' => 8,
            'monthly_income' => 340,
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()
            ->assertJsonPath('family.beneficiaries.0.id', $beneficiary->id);

        $beneficiary->refresh();
        $this->assertSame('family', $beneficiary->category?->name);
    }

    public function test_can_update_category_rule_and_recalculate_specific_beneficiary(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $secretary->syncRoles([UserRole::RecordingSecretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $healthCategory = Category::query()->where('name', 'health')->firstOrFail();

        $this->putJson('/api/v1/categories/'.$healthCategory->id.'/rule', [
            'max_monthly_income' => null,
            'min_family_members' => null,
            'requires_medical_case' => true,
            'is_active' => true,
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();

        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'monthly_income' => 400,
            'members_count' => 2,
        ]);
        $beneficiary = Beneficiary::factory()->create([
            'family_id' => $family->id,
            'medical_wallet_balance' => 0,
            'category_id' => null,
        ]);

        AidRequest::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'created_by' => User::factory()->create()->id,
            'type' => 'medical_prescription',
            'status' => 'approved',
        ]);

        $this->postJson('/api/v1/beneficiaries/'.$beneficiary->id.'/recalculate-category', [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()
            ->assertJsonPath('beneficiary.category.name', 'health');
    }

    public function test_beneficiary_with_chronic_illness_is_classified_when_rule_requires_health_condition(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $secretary->syncRoles([UserRole::RecordingSecretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $healthCategory = Category::query()->where('name', 'health')->firstOrFail();

        $this->putJson('/api/v1/categories/'.$healthCategory->id.'/rule', [
            'max_monthly_income' => null,
            'min_family_members' => null,
            'requires_medical_case' => false,
            'requires_health_condition' => true,
            'is_active' => true,
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();

        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'monthly_income' => 400,
            'members_count' => 2,
        ]);
        $beneficiary = Beneficiary::factory()->create([
            'family_id' => $family->id,
            'medical_wallet_balance' => 0,
            'category_id' => null,
            'health_status' => 'chronic_illness',
        ]);

        $this->postJson('/api/v1/beneficiaries/'.$beneficiary->id.'/recalculate-category', [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()
            ->assertJsonPath('beneficiary.category.name', 'health');
    }

    public function test_family_with_newborn_is_classified_when_rule_requires_min_newborns(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $secretary->syncRoles([UserRole::RecordingSecretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $healthCategory = Category::query()->where('name', 'health')->firstOrFail();

        $this->putJson('/api/v1/categories/'.$healthCategory->id.'/rule', [
            'max_monthly_income' => null,
            'min_family_members' => null,
            'requires_medical_case' => false,
            'min_newborns' => 1,
            'is_active' => true,
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();

        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'monthly_income' => 400,
            'members_count' => 2,
        ]);
        $beneficiary = Beneficiary::factory()->create([
            'family_id' => $family->id,
            'category_id' => null,
            'date_of_birth' => now()->subMonths(3),
        ]);

        $this->postJson('/api/v1/beneficiaries/'.$beneficiary->id.'/recalculate-category', [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()
            ->assertJsonPath('beneficiary.category.name', 'health');
    }

    public function test_family_is_classified_when_rule_requires_housing_status(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $secretary->syncRoles([UserRole::RecordingSecretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $healthCategory = Category::query()->where('name', 'health')->firstOrFail();

        $this->putJson('/api/v1/categories/'.$healthCategory->id.'/rule', [
            'max_monthly_income' => null,
            'min_family_members' => null,
            'requires_medical_case' => false,
            'housing_statuses' => ['rented'],
            'is_active' => true,
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();

        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'monthly_income' => 400,
            'members_count' => 2,
            'housing_status' => 'rented',
        ]);
        $beneficiary = Beneficiary::factory()->create([
            'family_id' => $family->id,
            'category_id' => null,
        ]);

        $this->postJson('/api/v1/beneficiaries/'.$beneficiary->id.'/recalculate-category', [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()
            ->assertJsonPath('beneficiary.category.name', 'health');
    }

    public function test_family_is_classified_when_rule_requires_min_children_under_18(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $secretary->syncRoles([UserRole::RecordingSecretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $healthCategory = Category::query()->where('name', 'health')->firstOrFail();

        $this->putJson('/api/v1/categories/'.$healthCategory->id.'/rule', [
            'max_monthly_income' => null,
            'min_family_members' => null,
            'requires_medical_case' => false,
            'min_children_under_18' => 2,
            'is_active' => true,
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();

        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'monthly_income' => 400,
            'members_count' => 4,
        ]);
        $beneficiary = Beneficiary::factory()->create([
            'family_id' => $family->id,
            'category_id' => null,
            'is_head_of_family' => true,
        ]);
        Beneficiary::factory()->create([
            'family_id' => $family->id,
            'age' => 10,
            'date_of_birth' => now()->subYears(10),
        ]);
        Beneficiary::factory()->create([
            'family_id' => $family->id,
            'age' => 14,
            'date_of_birth' => now()->subYears(14),
        ]);

        $this->postJson('/api/v1/beneficiaries/'.$beneficiary->id.'/recalculate-category', [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()
            ->assertJsonPath('beneficiary.category.name', 'health');
    }
}
