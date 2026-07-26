<?php

namespace App\Http\Controllers\Api;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\FamilyRelationship;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFamilyMemberRequest;
use App\Http\Requests\UpdateFamilyAidEligibilityRequest;
use App\Http\Requests\UpdateFamilyEnrollmentStatusRequest;
use App\Http\Requests\UpdateFamilyProfileRequest;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\Family;
use App\Models\MedicalRecord;
use App\Services\BeneficiaryAccountService;
use App\Services\BeneficiaryCategoryAssigner;
use App\Services\FamilyQrCodeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FamilyController extends Controller
{
    public function updateEnrollmentStatus(
        UpdateFamilyEnrollmentStatusRequest $request,
        Family $family,
        BeneficiaryAccountService $accountService
    ): JsonResponse {
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
            if ($current !== FamilyEnrollmentStatus::PendingBoard && $current !== FamilyEnrollmentStatus::UnderReview) {
                throw ValidationException::withMessages([
                    'enrollment_status' => [__('Only applications awaiting board review can be approved or rejected.')],
                ]);
            }
        } else {
            if (
                ! $user?->hasPermissionTo('beneficiaries.manage')
                && ! $user?->hasPermissionTo('families.enrollment.review')
            ) {
                abort(403, 'You are not authorized to update enrollment workflow.');
            }

            $allowed = match ($newStatus) {
                FamilyEnrollmentStatus::PendingBoard => in_array($current, [
                    FamilyEnrollmentStatus::Draft,
                    FamilyEnrollmentStatus::Rejected,
                    FamilyEnrollmentStatus::UnderReview,
                ], true),
                FamilyEnrollmentStatus::UnderReview => in_array($current, [
                    FamilyEnrollmentStatus::Draft,
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

        $credentials = null;
        if ($newStatus === FamilyEnrollmentStatus::Approved) {
            $credentials = $accountService->createCredentialsForFamilyIfMissing($family);
        }

        return response()->json([
            'message' => 'Enrollment status updated.',
            'family' => $family->fresh()->load('beneficiaries'),
            'credentials' => $credentials,
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
            $family->forceFill(['qr_token' => (string) Str::uuid()])->save();
            $family->refresh();
        }

        $payload = $generator->formatPayload($family->qr_token);
        $qr = $generator->toBase64Image($payload);

        return response()->json([
            'payload' => $payload,
            'png_base64' => $qr['base64'],
            'mime_type' => $qr['mime_type'],
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

    public function members(Family $family): JsonResponse
    {
        $members = $family->beneficiaries()
            ->with('category')
            ->orderByRaw("CASE family_relationship WHEN 'head' THEN 1 WHEN 'spouse' THEN 2 WHEN 'child' THEN 3 ELSE 4 END")
            ->orderBy('name')
            ->get();

        return response()->json([
            'family' => $family->only([
                'id',
                'family_code',
                'head_name',
                'members_count',
                'phone',
                'address',
                'neighborhood',
                'monthly_income',
                'housing_status',
                'enrollment_status',
                'has_direct_income',
                'aid_paused_at',
                'created_at',
            ]),
            'members' => $members,
        ]);
    }

    public function storeMember(
        StoreFamilyMemberRequest $request,
        Family $family,
        BeneficiaryCategoryAssigner $assigner
    ): JsonResponse {
        $validated = $request->validated();
        $relationship = FamilyRelationship::from($validated['family_relationship']);

        $beneficiary = Beneficiary::query()->create([
            'family_id' => $family->id,
            'category_id' => $validated['category_id'] ?? null,
            'national_id' => $validated['national_id'],
            'name' => $validated['name'],
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'health_status' => $validated['health_status'] ?? null,
            'health_details' => $validated['health_details'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_head_of_family' => $relationship === FamilyRelationship::Head,
            'family_relationship' => $relationship->value,
        ]);

        if (! isset($validated['category_id'])) {
            $assigner->assign($beneficiary);
        }

        $memberCount = $family->beneficiaries()->count();
        if ($memberCount > $family->members_count) {
            $family->forceFill(['members_count' => $memberCount])->save();
        }

        return response()->json([
            'message' => __('Family member added successfully.'),
            'beneficiary' => $beneficiary->load(['family', 'category']),
        ], 201);
    }

    public function updateProfile(
        UpdateFamilyProfileRequest $request,
        Family $family,
        BeneficiaryCategoryAssigner $assigner
    ): JsonResponse {
        $validated = $request->validated();

        if (array_key_exists('housing_status', $validated) && filled($validated['housing_status'])) {
            $validated['profile_completed_at'] = $family->profile_completed_at ?? now();
        }

        $family->forceFill($validated)->save();

        $family->beneficiaries()->each(fn (Beneficiary $beneficiary) => $assigner->assign($beneficiary));

        return response()->json([
            'message' => __('Family profile updated successfully.'),
            'family' => $family->fresh()->load('beneficiaries.category'),
        ]);
    }

    public function history(Family $family): JsonResponse
    {
        $family->load(['beneficiaries.category']);
        $beneficiaryIds = $family->beneficiaries->pluck('id');

        $aidRequests = AidRequest::query()
            ->whereIn('beneficiary_id', $beneficiaryIds)
            ->with([
                'beneficiary:id,name,family_id',
                'approvals.reviewer:id,name,email',
                'inventoryAllocations.inventoryItem:id,name,item_code',
                'inventoryAllocations.deliveryOfficer:id,name,email',
            ])
            ->latest('submitted_at')
            ->get();

        $medicalRecords = MedicalRecord::query()
            ->whereIn('beneficiary_id', $beneficiaryIds)
            ->with([
                'beneficiary:id,name,family_id',
                'doctor:id,name,email',
                'appointment:id,scheduled_at',
            ])
            ->latest('recorded_at')
            ->get();

        $deliveredAllocationsCount = $aidRequests
            ->flatMap(fn ($aidRequest) => $aidRequest->inventoryAllocations)
            ->filter(fn ($allocation) => $allocation->delivered_at !== null)
            ->count();

        $disbursedPrescriptionCount = $medicalRecords
            ->where('prescription_workflow_status', 'disbursed')
            ->count();

        return response()->json([
            'family' => $family,
            'aid_requests' => $aidRequests,
            'medical_records' => $medicalRecords,
            'summary' => [
                'beneficiaries_count' => $family->beneficiaries->count(),
                'aid_requests_count' => $aidRequests->count(),
                'delivered_allocations_count' => $deliveredAllocationsCount,
                'medical_records_count' => $medicalRecords->count(),
                'disbursed_prescriptions_count' => $disbursedPrescriptionCount,
            ],
        ]);
    }
}
