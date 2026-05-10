<?php

namespace App\Console\Commands;

use App\Enums\InventoryItemStatus;
use App\Models\AidRequest;
use App\Models\Donation;
use App\Models\InventoryItem;
use App\Models\VolunteerOpportunity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class RunSystemAutomationsCommand extends Command
{
    protected $signature = 'system:run-automations {--low-stock-threshold=5} {--expiry-window-days=30}';

    protected $description = 'Runs stock alerts, expiry alerts, distribution suggestions, and automated backup.';

    public function handle(): int
    {
        $threshold = max(1, (int) $this->option('low-stock-threshold'));
        $expiryWindowDays = max(1, (int) $this->option('expiry-window-days'));

        $lowStockItems = InventoryItem::query()
            ->where('status', InventoryItemStatus::Stored->value)
            ->where('quantity_remaining', '<=', $threshold)
            ->orderBy('quantity_remaining')
            ->get(['id', 'item_code', 'name', 'quantity_remaining', 'expiry_date'])
            ->map(fn (InventoryItem $item): array => [
                'id' => $item->id,
                'item_code' => $item->item_code,
                'name' => $item->name,
                'quantity_remaining' => $item->quantity_remaining,
                'expiry_date' => $item->expiry_date?->toDateString(),
            ])
            ->values()
            ->all();

        $expiryCutoff = now()->addDays($expiryWindowDays)->toDateString();
        $expiringItems = InventoryItem::query()
            ->where('status', InventoryItemStatus::Stored->value)
            ->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '<=', $expiryCutoff)
            ->orderBy('expiry_date')
            ->get(['id', 'item_code', 'name', 'quantity_remaining', 'expiry_date'])
            ->map(fn (InventoryItem $item): array => [
                'id' => $item->id,
                'item_code' => $item->item_code,
                'name' => $item->name,
                'quantity_remaining' => $item->quantity_remaining,
                'expiry_date' => $item->expiry_date?->toDateString(),
            ])
            ->values()
            ->all();

        $candidateItems = InventoryItem::query()
            ->where('status', InventoryItemStatus::Stored->value)
            ->where('quantity_remaining', '>', 0)
            ->orderByDesc('quantity_remaining')
            ->limit(6)
            ->get(['id', 'item_code', 'name', 'quantity_remaining', 'expiry_date']);

        $suggestions = AidRequest::query()
            ->where('status', 'approved')
            ->latest('submitted_at')
            ->limit(10)
            ->get(['id', 'type', 'beneficiary_id', 'requested_amount', 'submitted_at'])
            ->map(function (AidRequest $request) use ($candidateItems): array {
                $recommended = $candidateItems
                    ->take(3)
                    ->map(fn (InventoryItem $item): array => [
                        'inventory_item_id' => $item->id,
                        'item_code' => $item->item_code,
                        'name' => $item->name,
                        'suggested_quantity' => min(3, max(1, (int) $item->quantity_remaining)),
                    ])
                    ->values()
                    ->all();

                return [
                    'aid_request_id' => $request->id,
                    'beneficiary_id' => $request->beneficiary_id,
                    'type' => $request->type,
                    'requested_amount' => $request->requested_amount,
                    'submitted_at' => $request->submitted_at?->toDateTimeString(),
                    'recommended_items' => $recommended,
                ];
            })
            ->values()
            ->all();

        $volunteerAutoCloseSnapshot = VolunteerOpportunity::query()
            ->where('status', 'closed')
            ->whereColumn('filled_slots', '>=', 'required_slots')
            ->count();

        $payload = [
            'generated_at' => now()->toIso8601String(),
            'low_stock_alerts' => [
                'threshold' => $threshold,
                'count' => count($lowStockItems),
                'items' => $lowStockItems,
            ],
            'expiry_alerts' => [
                'window_days' => $expiryWindowDays,
                'count' => count($expiringItems),
                'items' => $expiringItems,
            ],
            'distribution_suggestions' => [
                'count' => count($suggestions),
                'requests' => $suggestions,
            ],
            'auto_registration_guard' => [
                'closed_full_opportunities' => $volunteerAutoCloseSnapshot,
            ],
            'backup' => [
                'donations_count' => Donation::query()->count(),
                'inventory_items_count' => InventoryItem::query()->count(),
                'aid_requests_count' => AidRequest::query()->count(),
                'volunteer_opportunities_count' => VolunteerOpportunity::query()->count(),
            ],
        ];

        $file = 'backups/system-backup-'.now()->format('Ymd-His').'.json';
        Storage::disk('local')->put($file, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $this->info('System automations ran successfully.');
        $this->line('Low stock alerts: '.count($lowStockItems));
        $this->line('Expiry alerts: '.count($expiringItems));
        $this->line('Distribution suggestions: '.count($suggestions));
        $this->line('Backup file: '.$file);

        return self::SUCCESS;
    }
}
