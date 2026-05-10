<?php

namespace Tests\Feature;

use App\Enums\InventoryItemStatus;
use App\Models\AidRequest;
use App\Models\Donation;
use App\Models\InventoryItem;
use App\Models\VolunteerOpportunity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SystemAutomationsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_automations_command_creates_backup_and_prints_summary(): void
    {
        Storage::fake('local');

        Donation::factory()->create();

        InventoryItem::factory()->create([
            'quantity_remaining' => 2,
            'status' => InventoryItemStatus::Stored,
            'expiry_date' => now()->addDays(3),
        ]);

        InventoryItem::factory()->create([
            'quantity_remaining' => 20,
            'status' => InventoryItemStatus::Stored,
            'expiry_date' => now()->addDays(2),
        ]);

        AidRequest::factory()->create([
            'status' => 'approved',
            'submitted_at' => now(),
        ]);

        VolunteerOpportunity::factory()->create([
            'required_slots' => 1,
            'filled_slots' => 1,
            'status' => 'closed',
        ]);

        Artisan::call('system:run-automations', [
            '--low-stock-threshold' => 5,
            '--expiry-window-days' => 30,
        ]);

        $output = Artisan::output();
        $this->assertStringContainsString('System automations ran successfully.', $output);

        $backups = Storage::disk('local')->files('backups');
        $this->assertNotEmpty($backups);

        $contents = Storage::disk('local')->get($backups[0]);
        $decoded = json_decode($contents, true);

        $this->assertIsArray($decoded);
        $this->assertArrayHasKey('low_stock_alerts', $decoded);
        $this->assertArrayHasKey('expiry_alerts', $decoded);
        $this->assertArrayHasKey('distribution_suggestions', $decoded);
        $this->assertArrayHasKey('auto_registration_guard', $decoded);
        $this->assertArrayHasKey('backup', $decoded);
        $this->assertSame(1, $decoded['low_stock_alerts']['count']);
    }
}
