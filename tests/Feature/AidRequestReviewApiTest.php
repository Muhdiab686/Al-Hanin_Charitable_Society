<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\AidRequest;
use App\Models\ApprovalRequest;
use App\Models\Beneficiary;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AidRequestReviewApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    /**
     * @return array{0: AidRequest, 1: User}
     */
    private function createPendingAidRequest(): array
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $beneficiaryUser->id]);
        $beneficiary->family->forceFill([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
        ])->save();

        $aidRequest = AidRequest::factory()->create([
            'beneficiary_id' => $beneficiary->id,
            'created_by' => $beneficiaryUser->id,
            'status' => 'pending',
        ]);

        ApprovalRequest::query()->create([
            'aid_request_id' => $aidRequest->id,
            'decision' => 'pending',
        ]);

        return [$aidRequest, $beneficiaryUser];
    }

    public function test_secretary_can_approve_pending_aid_request(): void
    {
        [$aidRequest] = $this->createPendingAidRequest();

        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $response = $this->patchJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/review',
            ['decision' => 'approved', 'review_note' => 'Board approved'],
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertOk()
            ->assertJsonPath('aid_request.status', 'approved');

        $this->assertDatabaseHas('approval_requests', [
            'aid_request_id' => $aidRequest->id,
            'decision' => 'approved',
        ]);
    }

    public function test_secretary_can_reject_pending_aid_request(): void
    {
        [$aidRequest] = $this->createPendingAidRequest();

        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('s')->plainTextToken;

        $this->patchJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/review',
            ['decision' => 'rejected'],
            ['Authorization' => 'Bearer '.$token]
        )->assertOk()
            ->assertJsonPath('aid_request.status', 'rejected');
    }

    public function test_beneficiary_cannot_review_aid_request(): void
    {
        [$aidRequest, $beneficiaryUser] = $this->createPendingAidRequest();
        $token = $beneficiaryUser->createToken('b')->plainTextToken;

        $this->patchJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/review',
            ['decision' => 'approved'],
            ['Authorization' => 'Bearer '.$token]
        )->assertForbidden();
    }

    public function test_cannot_review_non_pending_aid_request(): void
    {
        [$aidRequest] = $this->createPendingAidRequest();
        $aidRequest->forceFill(['status' => 'approved'])->save();

        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $this->patchJson(
            '/api/v1/aid-requests/'.$aidRequest->id.'/review',
            ['decision' => 'rejected'],
            ['Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken]
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['aid_request']);
    }
}
