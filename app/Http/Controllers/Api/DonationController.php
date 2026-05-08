<?php

namespace App\Http\Controllers\Api;

use App\Enums\DonationType;
use App\Enums\InventoryItemStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDonationRequest;
use App\Models\Donation;
use App\Models\FinancialTransaction;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DonationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Donation::query()->with(['registrar:id,name,email'])
            ->withCount('inventoryItems')
            ->latest();

        if ($request->user()?->hasRole('donor')) {
            $query->where('registered_by', $request->user()->id);
        }

        return response()->json($query->paginate(15));
    }

    public function store(StoreDonationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $donation = DB::transaction(function () use ($request, $validated): Donation {
            $receiptCode = $this->uniqueReceiptCode();
            $cashAmount = ($validated['type'] === DonationType::Cash->value)
                ? $validated['cash_amount']
                : null;

            $donation = Donation::query()->create([
                'type' => $validated['type'],
                'channel' => $validated['channel'] ?? 'manual',
                'cash_amount' => $cashAmount,
                'donor_name' => $validated['donor_name'] ?? null,
                'donor_phone' => $validated['donor_phone'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'receipt_code' => $receiptCode,
                'registered_by' => $request->user()->id,
            ]);

            if ($validated['type'] === DonationType::InKind->value) {
                foreach ($validated['items'] as $item) {
                    InventoryItem::query()->create([
                        'donation_id' => $donation->id,
                        'item_code' => $this->uniqueItemCode(),
                        'name' => $item['name'],
                        'spoilage_category' => $item['spoilage_category'],
                        'quantity' => $item['quantity'],
                        'quantity_remaining' => $item['quantity'],
                        'expiry_date' => $item['expiry_date'] ?? null,
                        'condition_notes' => $item['condition_notes'] ?? null,
                        'storage_location' => $item['storage_location'] ?? null,
                        'status' => InventoryItemStatus::Stored->value,
                    ]);
                }
            }

            if ($validated['type'] === DonationType::Cash->value) {
                FinancialTransaction::query()->create([
                    'type' => 'income',
                    'source' => 'donation_cash',
                    'amount' => $validated['cash_amount'],
                    'reference_type' => $donation::class,
                    'reference_id' => $donation->id,
                    'description' => 'Cash donation receipt '.$donation->receipt_code,
                    'recorded_by' => $request->user()->id,
                    'recorded_at' => now(),
                ]);
            }

            return $donation;
        });

        return response()->json([
            'message' => __('Donation recorded successfully.'),
            'donation' => $donation->fresh()->load(['inventoryItems', 'registrar:id,name,email']),
        ], 201);
    }

    public function show(Request $request, Donation $donation): JsonResponse
    {
        $this->authorizeDonationView($request, $donation);

        return response()->json($donation->load(['inventoryItems', 'registrar:id,name,email']));
    }

    private function authorizeDonationView(Request $request, Donation $donation): void
    {
        $user = $request->user();
        abort_if($user === null, 403);

        if ($user->hasRole('donor') && $donation->registered_by !== $user->id) {
            abort(403);
        }
    }

    private function uniqueReceiptCode(): string
    {
        do {
            $code = 'DON-'.strtoupper(bin2hex(random_bytes(6)));
        } while (Donation::query()->where('receipt_code', $code)->exists());

        return $code;
    }

    private function uniqueItemCode(): string
    {
        do {
            $code = 'INV-'.strtoupper(bin2hex(random_bytes(5)));
        } while (InventoryItem::query()->where('item_code', $code)->exists());

        return $code;
    }
}
