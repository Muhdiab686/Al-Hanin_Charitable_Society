<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\VolunteerOpportunity;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VolunteerOpportunitiesApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_secretary_can_create_update_and_delete_opportunity(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $create = $this->postJson('/api/v1/volunteer-opportunities', [
            'title' => 'Food packaging',
            'description' => 'Pack monthly supplies',
            'required_slots' => 5,
            'starts_at' => now()->addDay()->toDateTimeString(),
        ], ['Authorization' => 'Bearer '.$token]);

        $create->assertCreated()
            ->assertJsonPath('opportunity.status', 'open');

        $id = $create->json('opportunity.id');

        $this->patchJson('/api/v1/volunteer-opportunities/'.$id, [
            'required_slots' => 6,
            'title' => 'Food packaging updated',
        ], ['Authorization' => 'Bearer '.$token])->assertOk()
            ->assertJsonPath('opportunity.required_slots', 6);

        $this->deleteJson('/api/v1/volunteer-opportunities/'.$id, [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();
    }

    public function test_participant_can_register_and_opportunity_closes_when_full(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $secretaryToken = $secretary->createToken('sec')->plainTextToken;
        $createResponse = $this->postJson('/api/v1/volunteer-opportunities', [
            'title' => 'Field support',
            'required_slots' => 1,
            'starts_at' => now()->addDay()->toDateTimeString(),
        ], ['Authorization' => 'Bearer '.$secretaryToken]);

        $createResponse->assertCreated();
        $opportunityId = $createResponse->json('opportunity.id');

        $participantA = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $participantA->syncRoles([UserRole::Storekeeper->value]);
        $participantC = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $participantC->syncRoles([UserRole::Storekeeper->value]);
        $tokenA = $participantA->createToken('pa')->plainTextToken;
        $tokenC = $participantC->createToken('pc')->plainTextToken;

        $this->withToken($tokenA)->getJson('/api/v1/volunteer-opportunities')->assertOk();

        $this->withToken($tokenA)
            ->postJson('/api/v1/volunteer-opportunities/'.$opportunityId.'/register')
            ->assertCreated();

        $this->withToken($tokenC)
            ->postJson('/api/v1/volunteer-opportunities/'.$opportunityId.'/register')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['opportunity']);
    }

    public function test_participant_cannot_register_twice_to_same_opportunity(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $opportunity = VolunteerOpportunity::factory()->create([
            'required_slots' => 3,
            'status' => 'open',
            'created_by' => $secretary->id,
        ]);

        $participant = User::factory()->create(['role' => UserRole::Storekeeper->value]);
        $participant->syncRoles([UserRole::Storekeeper->value]);
        $token = $participant->createToken('p')->plainTextToken;

        $this->postJson('/api/v1/volunteer-opportunities/'.$opportunity->id.'/register', [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertCreated();

        $this->postJson('/api/v1/volunteer-opportunities/'.$opportunity->id.'/register', [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['opportunity']);
    }
}
