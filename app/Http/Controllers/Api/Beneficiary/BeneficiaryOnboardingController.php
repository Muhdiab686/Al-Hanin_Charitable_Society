<?php

namespace App\Http\Controllers\Api\Beneficiary;

use App\Enums\BeneficiaryFollowUpStatus;
use App\Enums\FamilyEnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Beneficiary\CompleteBeneficiaryProfileRequest;
use App\Http\Requests\Beneficiary\OnboardBeneficiaryRequest;
use App\Models\Beneficiary;
use App\Models\Family;
use App\Services\BeneficiaryAccountService;
use App\Services\FamilyProfileSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BeneficiaryOnboardingController extends Controller
{
    public function onboard(OnboardBeneficiaryRequest $request, BeneficiaryAccountService $accountService): JsonResponse
    {
        $validated = $request->validated();

        $result = $accountService->onboardWithGeneratedCredentials(
            $validated['family'],
            $validated['head'],
            $request->user()->id,
        );

        return response()->json([
            'message' => __('Beneficiary onboarded successfully. Share the generated credentials with the family.'),
            'beneficiary' => $result['beneficiary'],
            'user' => [
                'id' => $result['user']->id,
                'name' => $result['user']->name,
                'email' => $result['user']->email,
            ],
            'credentials' => $result['credentials'],
        ], 201);
    }

    public function completeProfile(
        CompleteBeneficiaryProfileRequest $request,
        FamilyProfileSyncService $syncService,
    ): JsonResponse {
        $beneficiary = Beneficiary::query()
            ->where('user_id', $request->user()->id)
            ->with('family')
            ->firstOrFail();

        $family = $syncService->syncFullProfile(
            $beneficiary->family,
            $request->validated('family'),
            $request->validated('members'),
        );

        return response()->json([
            'message' => __('Profile submitted successfully. Your application is now under review.'),
            'family' => $family,
        ]);
    }

    public function approve(Request $request, Family $family): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermissionTo('families.enrollment.review'),
            403,
        );

        abort_unless(
            in_array($family->enrollment_status, [
                FamilyEnrollmentStatus::UnderReview,
                FamilyEnrollmentStatus::PendingBoard,
            ], true),
            422,
            __('Only applications under review can be approved.'),
        );

        $family->forceFill([
            'enrollment_status' => FamilyEnrollmentStatus::Approved,
            'follow_up_status' => BeneficiaryFollowUpStatus::Active->value,
            'qr_token' => (string) Str::uuid(),
        ])->save();

        $family->beneficiaries()->update(['status' => 'active']);

        return response()->json([
            'message' => __('Beneficiary application approved successfully.'),
            'family' => $family->fresh()->load('beneficiaries'),
        ]);
    }

    public function profileStatus(Request $request): JsonResponse
    {
        $beneficiary = Beneficiary::query()
            ->where('user_id', $request->user()->id)
            ->with(['family.beneficiaries'])
            ->first();

        if ($beneficiary === null) {
            return response()->json([
                'has_profile' => false,
                'needs_completion' => true,
            ]);
        }

        $family = $beneficiary->family;

        return response()->json([
            'has_profile' => true,
            'beneficiary_id' => $beneficiary->id,
            'family_id' => $family?->id,
            'needs_completion' => $family?->profile_completed_at === null,
            'enrollment_status' => $family?->enrollment_status?->value,
            'follow_up_status' => $family?->follow_up_status,
            'family' => $family,
        ]);
    }
}
