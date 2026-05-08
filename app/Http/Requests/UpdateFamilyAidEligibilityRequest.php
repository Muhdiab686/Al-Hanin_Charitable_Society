<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateFamilyAidEligibilityRequest extends FormRequest
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
            'has_direct_income' => ['required', 'boolean'],
            'aid_pause_reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->boolean('has_direct_income') && ! $this->filled('aid_pause_reason')) {
                $validator->errors()->add(
                    'aid_pause_reason',
                    __('Aid pause reason is required when direct income is reported.')
                );
            }
        });
    }
}
