<?php

namespace App\Http\Requests;

use App\Enums\FamilyEnrollmentStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAidRequestRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'beneficiary_id' => [
                'required',
                Rule::exists('beneficiaries', 'id')->where(function (Builder $query): void {
                    $query->whereExists(function ($sub): void {
                        $sub->from('families')
                            ->whereColumn('families.id', 'beneficiaries.family_id')
                            ->where('families.enrollment_status', FamilyEnrollmentStatus::Approved->value)
                            ->where('families.has_direct_income', false)
                            ->whereNull('families.aid_paused_at');
                    });
                }),
            ],
            'type' => ['required', Rule::in(['urgent_financial', 'special_item', 'medical_prescription'])],
            'requested_amount' => ['nullable', 'numeric', 'min:0'],
            'description' => ['required', 'string', 'max:1000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:8192', 'mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'beneficiary_id.exists' => __('The selected beneficiary is invalid or their family enrollment is not approved.'),
        ];
    }
}
