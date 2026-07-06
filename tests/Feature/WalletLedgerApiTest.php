<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\AidDistributionPlan;
use App\Models\AidDistributionPlanLine;
use App\Models\Beneficiary;
use App\Models\ClinicStaffProfile;
use App\Models\DoctorPayoutRequest;
use App\Models\User;
use App\Models\WalletEntry;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletLedgerApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_doctor_wallet_shows_balance_after_payout_approval(): void
    {
        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);

        ClinicStaffProfile::query()->create([
            'user_id' => $doctor->id,
            'monthly_salary' => 250,
            'consultation_fee' => 10,
            'wallet_balance' => 0,
            'is_active' => true,
        ]);

        $payout = DoctorPayoutRequest::query()->create([
            'doctor_id' => $doctor->id,
            'period_start' => now()->startOfMonth()->toDateString(),
            'period_end' => now()->endOfMonth()->toDateString(),
            'consultations_count' => 0,
            'base_salary_amount' => 250,
            'consultation_fee_amount' => 10,
            'consultations_amount' => 0,
            'amount' => 250,
            'status' => 'pending',
            'requested_by' => $doctor->id,
        ]);

        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);
        $accountant->givePermissionTo('finance.expenses.manage');

        $this->patchJson('/api/v1/doctor-payout-requests/'.$payout->id.'/review', [
            'decision' => 'approved',
        ], ['Authorization' => 'Bearer '.$accountant->createToken('a')->plainTextToken])->assertOk();

        $this->actingAs($doctor, 'sanctum')
            ->getJson('/api/v1/doctor/wallet')
            ->assertOk()
            ->assertJsonPath('wallet.balance', '250.00')
            ->assertJsonCount(1, 'wallet.entries.data');

        $this->assertDatabaseHas('wallet_entries', [
            'owner_type' => 'doctor',
            'owner_id' => $doctor->id,
            'category' => 'doctor_payout',
            'direction' => 'credit',
        ]);
    }

    public function test_beneficiary_wallet_credits_cash_when_distribution_cycle_completes(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $beneficiary = Beneficiary::factory()->create(['medical_wallet_balance' => 0]);
        $beneficiary->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $plan = AidDistributionPlan::query()->create([
            'title' => 'Cash plan',
            'aid_type' => 'urgent_financial',
            'distribution_date' => now()->toDateString(),
            'distribution_frequency' => 'once',
            'cycles_per_year' => 1,
            'eligible_families_count' => 1,
            'total_amount' => 100,
            'status' => 'draft',
            'completed_cycles' => 0,
            'created_by' => $secretary->id,
        ]);

        AidDistributionPlanLine::query()->create([
            'aid_distribution_plan_id' => $plan->id,
            'family_id' => $beneficiary->family_id,
            'beneficiary_id' => $beneficiary->id,
            'allocated_amount' => 100,
            'allocation_rank' => 1,
        ]);

        $this->patchJson('/api/v1/aid-distribution-plans/'.$plan->id.'/complete-cycle', [], [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertOk();

        $beneficiary->refresh();
        $this->assertEquals(100.0, (float) $beneficiary->medical_wallet_balance);

        $this->assertDatabaseHas('wallet_entries', [
            'owner_type' => 'beneficiary',
            'owner_id' => $beneficiary->id,
            'category' => 'cash_aid',
        ]);

        $this->assertDatabaseHas('financial_transactions', [
            'type' => 'expense',
            'source' => 'beneficiary_cash_aid',
            'amount' => 100,
        ]);
    }

    public function test_beneficiary_can_view_own_wallet_entries(): void
    {
        $user = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $user->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create([
            'user_id' => $user->id,
            'medical_wallet_balance' => 15,
        ]);

        WalletEntry::query()->create([
            'owner_type' => 'beneficiary',
            'owner_id' => $beneficiary->id,
            'category' => 'cash_aid',
            'direction' => 'credit',
            'amount' => 15,
            'description' => 'Test cash aid',
            'recorded_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/beneficiary/medical-wallet')
            ->assertOk()
            ->assertJsonPath('wallet.balance', '15.00')
            ->assertJsonCount(1, 'wallet.entries.data');
    }
}
