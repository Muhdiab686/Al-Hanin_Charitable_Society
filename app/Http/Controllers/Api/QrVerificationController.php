<?php

namespace App\Http\Controllers\Api;

use App\Enums\FamilyEnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyQrPayloadRequest;
use App\Models\Family;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class QrVerificationController extends Controller
{
    public function verify(VerifyQrPayloadRequest $request): JsonResponse
    {
        $payload = $request->validated('payload');
        $token = substr($payload, strlen('hanin:'));

        $family = Family::query()
            ->where('qr_token', $token)
            ->where('enrollment_status', FamilyEnrollmentStatus::Approved)
            ->with(['beneficiaries.category'])
            ->first();

        if ($family === null) {
            throw ValidationException::withMessages([
                'payload' => [__('QR code not recognized or the family is not eligible for assistance.')],
            ]);
        }

        return response()->json([
            'verified' => true,
            'payload' => $payload,
            'family' => $family,
        ]);
    }
}
