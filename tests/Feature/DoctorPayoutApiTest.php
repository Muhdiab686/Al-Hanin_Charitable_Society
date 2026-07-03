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
            ->assertJsonPath('request.base_salary_amount', '100.00')
            ->assertJsonPath('request.consultation_fee_amount', '10.00')
            ->assertJsonPath('request.consultations_amount', '30.00')
            ->assertJsonPath('request.amount', '130.00');

        $this->assertSame(3, ClinicAppointment::query()
            ->where('doctor_id', $doctor->id)
            ->where('payout_status', 'pending_payment')
            ->count());
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
        $accountant->givePermissionTo('finance.expenses.manage');

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

    public function test_doctor_cannot_reclaim_already_pending_or_paid_consultations(): void
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

        $appointments = ClinicAppointment::factory()->count(2)->create([
            'doctor_id' => $doctor->id,
            'created_by' => $creator->id,
            'status' => 'completed',
            'payout_status' => 'completed',
            'scheduled_at' => now()->subDays(1)->toDateTimeString(),
        ]);

        $doctorToken = $doctor->createToken('doctor')->plainTextToken;
        $firstRequest = $this->postJson('/api/v1/doctor-payout-requests', [
            'period_start' => now()->subWeek()->toDateString(),
            'period_end' => now()->toDateString(),
        ], [
            'Authorization' => 'Bearer '.$doctorToken,
        ]);
        $firstRequest->assertCreated()
            ->assertJsonPath('request.consultations_count', 2)
            ->assertJsonPath('request.amount', '120.00');

        $firstRequestId = $firstRequest->json('request.id');
        $this->assertNotNull($firstRequestId);

        $secondRequest = $this->postJson('/api/v1/doctor-payout-requests', [
            'period_start' => now()->subMonths(2)->toDateString(),
            'period_end' => now()->subMonth()->toDateString(),
        ], [
            'Authorization' => 'Bearer '.$doctorToken,
        ]);
        $secondRequest->assertCreated()
            ->assertJsonPath('request.consultations_count', 0)
            ->assertJsonPath('request.amount', '100.00');

        foreach ($appointments as $appointment) {
            $this->assertDatabaseHas('clinic_appointments', [
                'id' => $appointment->id,
                'doctor_payout_request_id' => $firstRequestId,
                'payout_status' => 'pending_payment',
            ]);
        }
    }

    public function test_doctor_cannot_create_duplicate_payout_request_for_same_period(): void
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);

        ClinicStaffProfile::query()->create([
            'user_id' => $doctor->id,
            'monthly_salary' => 100,
            'consultation_fee' => 10,
            'is_active' => true,
        ]);

        $token = $doctor->createToken('doctor')->plainTextToken;
        $payload = [
            'period_start' => now()->subWeek()->toDateString(),
            'period_end' => now()->toDateString(),
        ];

        $this->postJson('/api/v1/doctor-payout-requests', $payload, [
            'Authorization' => 'Bearer '.$token,
        ])->assertCreated();

        $this->postJson('/api/v1/doctor-payout-requests', $payload, [
            'Authorization' => 'Bearer '.$token,
        ])->assertUnprocessable()
            ->assertSee('already exists');
    }

    public function test_accountant_index_returns_only_pending_requests_by_default(): void
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);

        DoctorPayoutRequest::query()->create([
            'doctor_id' => $doctor->id,
            'period_start' => now()->subDays(10)->toDateString(),
            'period_end' => now()->subDays(5)->toDateString(),
            'consultations_count' => 3,
            'base_salary_amount' => 100,
            'consultation_fee_amount' => 10,
            'consultations_amount' => 30,
            'amount' => 130,
            'status' => 'pending',
            'requested_by' => $doctor->id,
        ]);

        DoctorPayoutRequest::query()->create([
            'doctor_id' => $doctor->id,
            'period_start' => now()->subDays(20)->toDateString(),
            'period_end' => now()->subDays(15)->toDateString(),
            'consultations_count' => 2,
            'base_salary_amount' => 100,
            'consultation_fee_amount' => 10,
            'consultations_amount' => 20,
            'amount' => 120,
            'status' => 'approved',
            'requested_by' => $doctor->id,
        ]);

        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);
        $accountant->givePermissionTo('finance.reports.view');

        $response = $this->getJson('/api/v1/doctor-payout-requests', [
            'Authorization' => 'Bearer '.$accountant->createToken('a')->plainTextToken,
        ]);

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'pending');
    }
}
