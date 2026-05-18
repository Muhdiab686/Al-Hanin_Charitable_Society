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

    private function secretaryToken(): string
    {
        $user = User::factory()->create(['role' => UserRole::Secretary->value]);
        $user->syncRoles([UserRole::Secretary->value]);

        return $user->createToken('test')->plainTextToken;
    }

    public function test_secretary_can_add_spouse_to_existing_family(): void
    {
        $family = Family::factory()->create(['members_count' => 2]);
        $headers = ['Authorization' => 'Bearer '.$this->secretaryToken()];

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

    public function test_secretary_can_list_family_members(): void
    {
        $family = Family::factory()->create();
        $headers = ['Authorization' => 'Bearer '.$this->secretaryToken()];

        $this->getJson('/api/v1/families/'.$family->id.'/members', $headers)
            ->assertOk()
            ->assertJsonPath('family.id', $family->id)
            ->assertJsonStructure(['members']);
    }
}
