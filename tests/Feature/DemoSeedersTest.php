<?php

namespace Tests\Feature;

use App\Models\Donation;
use App\Models\User;
use Database\Seeders\DemoAccountsSeeder;
use Database\Seeders\DemoDataSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoSeedersTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_accounts_seeder_creates_all_demo_users(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(DemoAccountsSeeder::class);

        foreach (DemoAccountsSeeder::demoAccounts() as $row) {
            $this->assertDatabaseHas('users', [
                'email' => $row['email'],
                'role' => $row['role']->value,
            ]);
        }

        $admin = User::query()->where('email', 'admin@hanin.test')->firstOrFail();
        $this->assertTrue($admin->hasRole('admin'));
    }

    public function test_demo_data_seeder_is_idempotent(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(DemoAccountsSeeder::class);
        $this->seed(DemoDataSeeder::class);

        $first = Donation::query()->where('receipt_code', 'like', 'DON-SEED-%')->count();
        $this->assertGreaterThan(0, $first);

        $this->seed(DemoDataSeeder::class);

        $second = Donation::query()->where('receipt_code', 'like', 'DON-SEED-%')->count();
        $this->assertSame($first, $second);
    }
}
