<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ClinicAppointment;
use App\Models\ClinicStaffProfile;
use App\Models\DoctorPayoutRequest;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorPayoutApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_doctor_can_create_payout_request_based_on_completed_consultations(): void
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);

        ClinicStaffProfile::query()->create([
            'user_id' => $doctor->id,
            'monthly_salary' => 100,
            'consultation_fee' => 10,
            'is_active' => true,
        ]);

        $creator = User::factory()->create(['role' => UserRole::Secretary->value]);
        $creator->syncRoles([UserRole::Secretary->value]);

        ClinicAppointment::factory()->count(3)->create([
            'doctor_id' => $doctor->id,
            'created_by' => $creator->id,
            'status' => 'completed',
            'scheduled_at' => now()->subDays(2)->toDateTimeString(),
        ]);

        $response = $this->postJson('/api/v1/doctor-payout-requests', [
            'period_start' => now()->subWeek()->toDateString(),
            'period_end' => now()->toDateString(),
        ], [
            'Authorization' => 'Bearer '.$doctor->createToken('d')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonPath('request.consultations_count', 3)
            ->assertJsonPath('request.amount', '130.00');
    }

    public function test_accountant_can_review_pending_payout_request(): void
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);
        ClinicStaffProfile::query()->create([
            'user_id' => $doctor->id,
            'monthly_salary' => 200,
            'consultation_fee' => 5,
            'is_active' => true,
        ]);

        $requester = $doctor;
        $payout = DoctorPayoutRequest::query()->create([
            'doctor_id' => $doctor->id,
            'period_start' => now()->subMonth()->toDateString(),
            'period_end' => now()->toDateString(),
            'consultations_count' => 4,
            'amount' => 220,
            'status' => 'pending',
            'requested_by' => $requester->id,
        ]);

        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);

        $this->patchJson('/api/v1/doctor-payout-requests/'.$payout->id.'/review', [
            'decision' => 'approved',
            'review_note' => 'Approved for payment',
        ], [
            'Authorization' => 'Bearer '.$accountant->createToken('a')->plainTextToken,
        ])->assertOk()
            ->assertJsonPath('request.status', 'approved');

        $this->assertDatabaseHas('financial_transactions', [
            'type' => 'expense',
            'source' => 'doctor_payout',
            'reference_type' => DoctorPayoutRequest::class,
            'reference_id' => $payout->id,
        ]);
    }
}
