<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublishAidRequestForDonorsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_approved_aid_request_can_be_published_for_donors(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $headers = ['Authorization' => 'Bearer '.$secretary->createToken('t')->plainTextToken];

        $beneficiary = Beneficiary::factory()->create();
        $beneficiary->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $aidRequest = AidRequest::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'approved',
        ]);

        $this->patchJson('/api/v1/aid-requests/'.$aidRequest->id.'/publish-for-donors', [
            'public_title' => 'حالة طارئة تحتاج دعم',
            'public_summary' => 'عائلة بحاجة لتغطية عملية طبية.',
        ], $headers)
            ->assertOk()
            ->assertJsonPath('aid_request.public_title', 'حالة طارئة تحتاج دعم');

        $this->assertNotNull($aidRequest->fresh()->published_for_donors_at);
    }

    public function test_donor_can_list_published_aid_requests(): void
    {
        $donor = User::factory()->create(['role' => UserRole::Donor->value]);
        $donor->syncRoles([UserRole::Donor->value]);
        $headers = ['Authorization' => 'Bearer '.$donor->createToken('t')->plainTextToken];

        $beneficiary = Beneficiary::factory()->create();
        AidRequest::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'approved',
            'public_title' => 'منشور',
            'public_summary' => 'ملخص',
            'published_for_donors_at' => now(),
        ]);

        AidRequest::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'rejected',
        ]);

        $this->getJson('/api/v1/published-aid-requests', $headers)
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
