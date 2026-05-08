<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Donation;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_cash_donation_creates_income_financial_transaction_with_channel(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);

        $response = $this->postJson('/api/v1/donations', [
            'type' => 'cash',
            'channel' => 'web',
            'cash_amount' => 75.25,
            'donor_name' => 'Web Donor',
        ], [
            'Authorization' => 'Bearer '.$accountant->createToken('a')->plainTextToken,
        ]);

        $response->assertCreated()
            ->assertJsonPath('donation.channel', 'web');

        $donationId = $response->json('donation.id');

        $this->assertDatabaseHas('financial_transactions', [
            'type' => 'income',
            'source' => 'donation_cash',
            'reference_type' => Donation::class,
            'reference_id' => $donationId,
            'amount' => 75.25,
        ]);
    }

    public function test_accountant_can_get_finance_summary(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);
        $token = $accountant->createToken('a')->plainTextToken;

        $this->postJson('/api/v1/donations', [
            'type' => 'cash',
            'channel' => 'manual',
            'cash_amount' => 100,
            'donor_name' => 'Donor One',
        ], ['Authorization' => 'Bearer '.$token])->assertCreated();

        $this->postJson('/api/v1/donations', [
            'type' => 'cash',
            'channel' => 'web',
            'cash_amount' => 50.50,
            'donor_name' => 'Donor Two',
        ], ['Authorization' => 'Bearer '.$token])->assertCreated();

        $summary = $this->getJson('/api/v1/finance/summary', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $summary->assertOk()
            ->assertJsonPath('totals.income', '150.50')
            ->assertJsonPath('totals.expenses', '0.00')
            ->assertJsonPath('totals.net', '150.50');
    }

    public function test_non_accountant_cannot_view_finance_summary(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $this->getJson('/api/v1/finance/summary', [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertForbidden();
    }
}
