<?php

namespace Tests\Feature;

use App\Enums\FamilyRelationship;
use App\Enums\UserRole;
use App\Models\Family;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyMemberApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function recordingSecretaryToken(): string
    {
        $user = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $user->syncRoles([UserRole::RecordingSecretary->value]);

        return $user->createToken('test')->plainTextToken;
    }

    public function test_recording_secretary_can_add_spouse_to_existing_family(): void
    {
        $family = Family::factory()->create(['members_count' => 2]);
        $headers = ['Authorization' => 'Bearer '.$this->recordingSecretaryToken()];

        $response = $this->postJson('/api/v1/families/'.$family->id.'/members', [
            'national_id' => 'SPOUSE-001',
            'name' => 'زوجة رب الأسرة',
            'family_relationship' => FamilyRelationship::Spouse->value,
            'gender' => 'female',
        ], $headers);

        $response->assertCreated()
            ->assertJsonPath('beneficiary.family_relationship', FamilyRelationship::Spouse->value);

        $this->assertDatabaseHas('beneficiaries', [
            'family_id' => $family->id,
            'national_id' => 'SPOUSE-001',
            'family_relationship' => FamilyRelationship::Spouse->value,
        ]);
    }

<<<<<<< HEAD
    public function test_secretary_can_add_member_with_health_status_and_newborn_date_of_birth(): void
    {
        $family = Family::factory()->create(['members_count' => 1]);
        $headers = ['Authorization' => 'Bearer '.$this->secretaryToken()];

        $response = $this->postJson('/api/v1/families/'.$family->id.'/members', [
            'national_id' => 'NEWBORN-001',
            'name' => 'مولود جديد',
            'family_relationship' => FamilyRelationship::Child->value,
            'date_of_birth' => now()->subMonths(2)->toDateString(),
            'health_status' => 'chronic_illness',
            'health_details' => 'يحتاج متابعة دورية',
        ], $headers);

        $response->assertCreated()
            ->assertJsonPath('beneficiary.health_status', 'chronic_illness');

        $this->assertDatabaseHas('beneficiaries', [
            'family_id' => $family->id,
            'national_id' => 'NEWBORN-001',
            'health_status' => 'chronic_illness',
            'health_details' => 'يحتاج متابعة دورية',
        ]);
    }

    public function test_secretary_can_list_family_members(): void
=======
    public function test_recording_secretary_can_list_family_members(): void
>>>>>>> 030dea290fe1113156c4c0bf3953d758b3aca194
    {
        $family = Family::factory()->create();
        $headers = ['Authorization' => 'Bearer '.$this->recordingSecretaryToken()];

        $this->getJson('/api/v1/families/'.$family->id.'/members', $headers)
            ->assertOk()
            ->assertJsonPath('family.id', $family->id)
            ->assertJsonStructure([
                'family' => [
                    'id',
                    'family_code',
                    'head_name',
                    'members_count',
                    'phone',
                    'address',
                    'housing_status',
                    'enrollment_status',
                ],
                'members',
            ]);
    }
}
