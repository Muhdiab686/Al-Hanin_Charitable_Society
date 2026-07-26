<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\Family;
use App\Models\User;
use App\Notifications\SystemDatabaseNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BeneficiaryAidWalletApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_creating_distribution_plan_notifies_beneficiary_and_shows_item_label_in_wallet(): void
    {
        Notification::fake();

        $secretary = User::factory()->create(['role' => UserRole::Secretary]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);

        $family = Family::factory()->create([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'has_direct_income' => false,
            'aid_paused_at' => null,
            'members_count' => 4,
            'housing_status' => 'rented',
        ]);
        Beneficiary::factory()->create([
            'family_id' => $family->id,
            'user_id' => $beneficiaryUser->id,
            'is_head_of_family' => true,
        ]);

        $this->postJson('/api/v1/aid-distribution-plans', [
            'title' => 'توزيع يوليو',
            'aid_type' => 'special_item',
            'item_label' => 'سلة غذائية',
            'distribution_date' => now()->toDateString(),
            'distribution_frequency' => 'once',
            'total_units' => 10,
        ], [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ])->assertCreated();

        Notification::assertSentTo($beneficiaryUser, SystemDatabaseNotification::class);

        $this->actingAs($beneficiaryUser, 'sanctum');

        $wallet = $this->getJson('/api/v1/beneficiary/aid-wallet')->assertOk();

        $this->assertSame('سلة غذائية', $wallet->json('entries.0.item_label'));
        $this->assertStringContainsString('سلة غذائية', (string) $wallet->json('entries.0.description'));
    }
}
