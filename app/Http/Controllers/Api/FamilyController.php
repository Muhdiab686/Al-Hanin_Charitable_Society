<?php

namespace App\Http\Controllers\Api;

use App\Enums\FamilyEnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFamilyAidEligibilityRequest;
use App\Http\Requests\UpdateFamilyEnrollmentStatusRequest;
use App\Http\Requests\UpdateFamilyProfileRequest;
use App\Models\Beneficiary;
use App\Models\Family;
use App\Services\BeneficiaryCategoryAssigner;
use App\Services\FamilyQrCodeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FamilyController extends Controller
{
    public function updateEnrollmentStatus(UpdateFamilyEnrollmentStatusRequest $request, Family $family): JsonResponse
    {
        $newStatus = FamilyEnrollmentStatus::from($request->validated('enrollment_status'));

        if ($newStatus === $family->enrollment_status) {
            return response()->json([
                'message' => 'Enrollment status unchanged.',
                'family' => $family->load('beneficiaries'),
            ]);
        }

        $user = $request->user();
        $current = $family->enrollment_status;

        if (in_array($newStatus, [FamilyEnrollmentStatus::Approved, FamilyEnrollmentStatus::Rejected], true)) {
            if (! $user?->hasPermissionTo('families.enrollment.review')) {
                abort(403, 'You are not authorized to approve or reject enrollment.');
            }
            if ($current !== FamilyEnrollmentStatus::PendingBoard) {
                throw ValidationException::withMessages([
                    'enrollment_status' => [__('Only applications awaiting board review can be approved or rejected.')],
                ]);
            }
        } else {
            if (! $user?->hasPermissionTo('beneficiaries.manage')) {
                abort(403, 'You are not authorized to update enrollment workflow.');
            }

            $allowed = match ($newStatus) {
                FamilyEnrollmentStatus::PendingBoard => in_array($current, [
                    FamilyEnrollmentStatus::Draft,
                    FamilyEnrollmentStatus::Rejected,
                ], true),
                FamilyEnrollmentStatus::Draft => in_array($current, [
                    FamilyEnrollmentStatus::Draft,
                    FamilyEnrollmentStatus::PendingBoard,
                ], true),
                default => false,
            };

            if (! $allowed) {
                throw ValidationException::withMessages([
                    'enrollment_status' => [__('This enrollment status change is not allowed.')],
                ]);
            }
        }

        $attributes = ['enrollment_status' => $newStatus];

        if ($newStatus === FamilyEnrollmentStatus::Approved) {
            $attributes['qr_token'] = (string) Str::uuid();
        }

        $family->forceFill($attributes)->save();

        return response()->json([
            'message' => 'Enrollment status updated.',
            'family' => $family->fresh()->load('beneficiaries'),
        ]);
    }

    public function qrCode(Request $request, Family $family, FamilyQrCodeGenerator $generator): JsonResponse
    {
        $user = $request->user();

        $canView = $user->hasPermissionTo('beneficiaries.view')
            || $user->hasPermissionTo('beneficiaries.manage')
            || Beneficiary::query()->where('user_id', $user->id)->where('family_id', $family->id)->exists();

        if (! $canView) {
            abort(403, 'You are not authorized to view this QR code.');
        }

        if ($family->enrollment_status !== FamilyEnrollmentStatus::Approved) {
            throw ValidationException::withMessages([
                'family' => [__('Family enrollment must be approved before a QR code is issued.')],
            ]);
        }

        if ($family->qr_token === null) {
            throw ValidationException::withMessages([
                'family' => [__('QR token is missing; approve enrollment again or contact support.')],
            ]);
        }

        $payload = $generator->formatPayload($family->qr_token);

        return response()->json([
            'payload' => $payload,
            'png_base64' => $generator->toBase64Png($payload),
            'mime_type' => 'image/png',
        ]);
    }

    public function updateAidEligibility(UpdateFamilyAidEligibilityRequest $request, Family $family): JsonResponse
    {
        $validated = $request->validated();
        $hasDirectIncome = (bool) $validated['has_direct_income'];

        $family->forceFill([
            'has_direct_income' => $hasDirectIncome,
            'aid_paused_at' => $hasDirectIncome ? now() : null,
            'aid_pause_reason' => $hasDirectIncome ? ($validated['aid_pause_reason'] ?? null) : null,
        ])->save();

        return response()->json([
            'message' => $hasDirectIncome
                ? __('Family aid eligibility has been paused.')
                : __('Family aid eligibility has been resumed.'),
            'family' => $family->fresh()->load('beneficiaries'),
        ]);
    }

    public function updateProfile(
        UpdateFamilyProfileRequest $request,
        Family $family,
        BeneficiaryCategoryAssigner $assigner
    ): JsonResponse {
        $family->forceFill($request->validated())->save();

        $family->beneficiaries()->each(fn (Beneficiary $beneficiary) => $assigner->assign($beneficiary));

        return response()->json([
            'message' => __('Family profile updated successfully.'),
            'family' => $family->fresh()->load('beneficiaries.category'),
        ]);
    }
}
