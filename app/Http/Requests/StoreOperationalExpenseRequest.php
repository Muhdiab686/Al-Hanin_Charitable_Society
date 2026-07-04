<?php

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreOperationalExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('finance.expenses.manage') ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:500'],
            'invoice_reference' => ['nullable', 'string', 'max:128'],
            'vendor' => ['nullable', 'string', 'max:255'],
            'campaign_id' => ['nullable', 'integer', 'exists:campaigns,id'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->filled('campaign_id')) {
                $campaign = Campaign::query()->find($this->input('campaign_id'));
                if ($campaign !== null && ! $campaign->isSpendable()) {
                    $validator->errors()->add('campaign_id', __('Expenses cannot be recorded against this campaign in its current status.'));
                }
            }
        });
    }
}
