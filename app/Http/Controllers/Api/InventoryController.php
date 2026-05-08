<?php

namespace App\Http\Controllers\Api;

use App\Enums\InventoryItemStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInventoryRemovalRequest;
use App\Models\InventoryItem;
use App\Models\InventoryRemoval;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = InventoryItem::query()
            ->with(['donation:id,receipt_code,type,donor_name'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('spoilage_category')) {
            $query->where('spoilage_category', (string) $request->string('spoilage_category'));
        }

        if ($request->filled('expires_before')) {
            $query->whereDate('expiry_date', '<=', (string) $request->string('expires_before'));
        }

        if ($request->filled('q')) {
            $keyword = trim((string) $request->string('q'));
            $query->where(function ($subQuery) use ($keyword): void {
                $subQuery->where('name', 'like', '%'.$keyword.'%')
                    ->orWhere('item_code', 'like', '%'.$keyword.'%');
            });
        }

        return response()->json($query->paginate(15));
    }

    public function remove(StoreInventoryRemovalRequest $request, InventoryItem $inventoryItem): JsonResponse
    {
        $validated = $request->validated();

        $payload = DB::transaction(function () use ($request, $inventoryItem, $validated): array {
            $item = InventoryItem::query()
                ->whereKey($inventoryItem->id)
                ->lockForUpdate()
                ->first();

            if ($item === null) {
                throw ValidationException::withMessages([
                    'inventory_item' => [__('Inventory item was not found.')],
                ]);
            }

            if ($item->status !== InventoryItemStatus::Stored) {
                throw ValidationException::withMessages([
                    'inventory_item' => [__('Only stored inventory items can be removed from stock.')],
                ]);
            }

            if ($item->quantity_remaining < $validated['quantity']) {
                throw ValidationException::withMessages([
                    'quantity' => [__('Requested removal quantity exceeds available stock.')],
                ]);
            }

            $removal = InventoryRemoval::query()->create([
                'inventory_item_id' => $item->id,
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'],
                'notes' => $validated['notes'] ?? null,
                'removed_by' => $request->user()->id,
                'removed_at' => now(),
            ]);

            $item->quantity_remaining -= $validated['quantity'];

            if ($item->quantity_remaining === 0) {
                $item->status = InventoryItemStatus::Disposed;
            }

            $item->save();

            return [
                'item' => $item->fresh()->load('donation:id,receipt_code,type,donor_name'),
                'removal' => $removal->fresh()->load('remover:id,name,email'),
            ];
        });

        return response()->json([
            'message' => __('Inventory item removed successfully.'),
            'inventory_item' => $payload['item'],
            'removal' => $payload['removal'],
        ], 201);
    }
}
