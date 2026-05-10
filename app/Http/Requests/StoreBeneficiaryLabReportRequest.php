<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreBeneficiaryLabReportRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'findings' => ['nullable', 'string', 'max:8000'],
            'attachment' => ['nullable', 'file', 'max:8192', 'mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx'],
        ];
    }
}
