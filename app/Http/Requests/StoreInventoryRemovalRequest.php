<?php

namespace App\Http\Requests;

use App\Enums\InventoryItemStatus;
use App\Enums\InventoryRemovalReason;
use App\Models\InventoryItem;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreInventoryRemovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['required', Rule::enum(InventoryRemovalReason::class)],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var InventoryItem|null $inventoryItem */
            $inventoryItem = $this->route('inventoryItem');

            if ($inventoryItem === null) {
                return;
            }

            if ($inventoryItem->status !== InventoryItemStatus::Stored) {
                $validator->errors()->add(
                    'inventory_item',
                    __('Only stored inventory items can be removed from stock.')
                );
            }
        });
    }
}
