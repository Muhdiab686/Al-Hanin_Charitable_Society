<?php

namespace App\Http\Requests;

use App\Enums\DonationType;
use App\Enums\InventorySpoilageCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreDonationRequest extends FormRequest
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
            'type' => ['required', Rule::enum(DonationType::class)],
            'channel' => ['nullable', Rule::in(['web', 'manual'])],
            'cash_amount' => ['nullable', 'numeric', 'min:0'],
            'donor_name' => ['nullable', 'string', 'max:255'],
            'donor_phone' => ['nullable', 'string', 'max:64'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['sometimes', 'array'],
            'items.*.name' => ['required_with:items', 'string', 'max:255'],
            'items.*.spoilage_category' => ['required_with:items', Rule::enum(InventorySpoilageCategory::class)],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1', 'max:999999'],
            'items.*.expiry_date' => ['nullable', 'date'],
            'items.*.condition_notes' => ['nullable', 'string', 'max:500'],
            'items.*.storage_location' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $user = $this->user();
            $type = $this->input('type');

            if ($type === DonationType::Cash->value) {
                if ($this->filled('items') && is_array($this->input('items')) && count($this->input('items')) > 0) {
                    $validator->errors()->add('items', __('Cash donations cannot include inventory lines.'));
                }
                if (! $this->filled('cash_amount')) {
                    $validator->errors()->add('cash_amount', __('Cash amount is required for cash donations.'));
                }
            }

            if ($type === DonationType::InKind->value) {
                $items = $this->input('items');
                if (! is_array($items) || count($items) < 1) {
                    $validator->errors()->add('items', __('In-kind donations require at least one inventory item.'));
                }
                if ($user !== null && ! $user->can('inventory.manage')) {
                    $validator->errors()->add('type', __('You are not allowed to register in-kind donations.'));
                }
            }
        });
    }
}
