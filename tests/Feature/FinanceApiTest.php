<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Campaign;
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

    public function test_admin_can_record_operational_expense(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);

        $response = $this->postJson('/api/v1/finance/expenses', [
            'amount' => 198.75,
            'description' => 'صيانة آليات المستودع',
            'invoice_reference' => 'INV-9001',
            'vendor' => 'مورد الأمل',
            'notes' => 'فاتورة شهرية',
        ], [
            'Authorization' => 'Bearer '.$admin->createToken('adm')->plainTextToken,
        ]);

        $response->assertCreated()->assertJsonPath('transaction.type', 'expense');
        $this->assertDatabaseHas('financial_transactions', [
            'type' => 'expense',
            'source' => 'operational_invoice',
            'amount' => 198.75,
            'recorded_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('operational_expenses', [
            'invoice_reference' => 'INV-9001',
            'vendor' => 'مورد الأمل',
        ]);
    }

    public function test_secretary_cannot_record_operational_expense(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $this->postJson('/api/v1/finance/expenses', [
            'amount' => 50,
        ], [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertForbidden();
    }

    public function test_cash_donation_for_campaign_updates_campaign_wallet_and_campaign_expense_reduces_balance(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);
        $token = $accountant->createToken('a3')->plainTextToken;

        $campaign = Campaign::query()->create([
            'title' => 'دفء الشتاء',
            'goal_amount' => 1000,
            'raised_amount' => 0,
            'spent_amount' => 0,
            'status' => 'active',
            'created_by' => $accountant->id,
        ]);

        $this->postJson('/api/v1/donations', [
            'type' => 'cash',
            'channel' => 'web',
            'cash_amount' => 200,
            'donor_name' => 'Campaign Donor',
            'campaign_id' => $campaign->id,
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertCreated();

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'raised_amount' => 200,
        ]);

        $this->postJson('/api/v1/finance/expenses', [
            'amount' => 50,
            'description' => 'شراء مواد حملة',
            'campaign_id' => $campaign->id,
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertCreated();

        $this->assertDatabaseHas('financial_transactions', [
            'source' => 'campaign_invoice',
            'amount' => 50,
        ]);
        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'raised_amount' => 200,
            'spent_amount' => 50,
        ]);

        $this->assertDatabaseHas('campaign_wallet_transactions', [
            'direction' => 'debit',
            'source' => 'campaign_invoice',
            'amount' => 50,
        ]);
    }

    public function test_campaign_expense_cannot_exceed_wallet_balance(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);
        $token = $accountant->createToken('overspend')->plainTextToken;

        $campaign = Campaign::query()->create([
            'title' => 'حملة محدودة الرصيد',
            'goal_amount' => 1000,
            'raised_amount' => 0,
            'spent_amount' => 0,
            'status' => 'active',
            'created_by' => $accountant->id,
        ]);

        $this->postJson('/api/v1/donations', [
            'type' => 'cash',
            'channel' => 'web',
            'cash_amount' => 30,
            'campaign_id' => $campaign->id,
            'donor_name' => 'Small donor',
        ], ['Authorization' => 'Bearer '.$token])->assertCreated();

        $this->postJson('/api/v1/finance/expenses', [
            'amount' => 100,
            'description' => 'محاولة صرف تتجاوز الرصيد',
            'campaign_id' => $campaign->id,
        ], ['Authorization' => 'Bearer '.$token])->assertUnprocessable();

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'spent_amount' => 0,
        ]);
    }

    public function test_expense_cannot_be_recorded_against_draft_campaign(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);
        $token = $accountant->createToken('draft-expense')->plainTextToken;

        $campaign = Campaign::query()->create([
            'title' => 'حملة مسودة',
            'goal_amount' => 500,
            'raised_amount' => 0,
            'spent_amount' => 0,
            'status' => 'draft',
            'created_by' => $accountant->id,
        ]);

        $this->postJson('/api/v1/finance/expenses', [
            'amount' => 10,
            'description' => 'صرف على حملة غير منشورة',
            'campaign_id' => $campaign->id,
        ], ['Authorization' => 'Bearer '.$token])->assertUnprocessable();
    }
}
