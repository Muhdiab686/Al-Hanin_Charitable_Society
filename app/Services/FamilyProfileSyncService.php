<?php

namespace App\Services;

use App\Enums\BeneficiaryFollowUpStatus;
use App\Enums\FamilyEnrollmentStatus;
use App\Enums\FamilyRelationship;
use App\Models\Beneficiary;
use App\Models\Family;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FamilyProfileSyncService
{
    public function __construct(private BeneficiaryCategoryAssigner $assigner) {}

    /**
     * @param  array<string, mixed>  $familyData
     * @param  array<int, array<string, mixed>>  $members
     */
    public function syncFullProfile(Family $family, array $familyData, array $members): Family
    {
        return DB::transaction(function () use ($family, $familyData, $members): Family {
            $family->forceFill([
                'full_family_name' => $familyData['full_family_name'] ?? $family->full_family_name,
                'head_name' => $familyData['head_name'] ?? $family->head_name,
                'phone' => $familyData['phone'] ?? $family->phone,
                'province' => $familyData['province'] ?? $family->province,
                'city' => $familyData['city'] ?? $family->city,
                'neighborhood' => $familyData['neighborhood'] ?? $family->neighborhood,
                'address' => $familyData['address'] ?? $family->address,
                'housing_status' => $familyData['housing_status'] ?? $family->housing_status,
                'monthly_income' => $familyData['total_monthly_income'] ?? $familyData['monthly_income'] ?? $family->monthly_income,
                'members_count' => max(count($members), (int) ($familyData['members_count'] ?? $family->members_count)),
                'previous_charity_aid' => $familyData['previous_charity_aid'] ?? $family->previous_charity_aid,
                'urgent_needs' => $familyData['urgent_needs'] ?? $family->urgent_needs,
                'profile_completed_at' => now(),
                'enrollment_status' => FamilyEnrollmentStatus::UnderReview,
                'follow_up_status' => BeneficiaryFollowUpStatus::UnderReview->value,
            ])->save();

            $keptIds = [];

            foreach ($members as $memberData) {
                $relationship = $memberData['family_relationship'] ?? FamilyRelationship::Other->value;
                $dob = isset($memberData['date_of_birth']) ? Carbon::parse($memberData['date_of_birth']) : null;
                $age = $memberData['age'] ?? ($dob ? $dob->age : null);

                $payload = [
                    'name' => $memberData['name'],
                    'national_id' => $memberData['national_id'] ?? ('MEM-'.$family->id.'-'.Str::upper(Str::random(6))),
                    'date_of_birth' => $dob,
                    'age' => $age,
                    'gender' => $memberData['gender'] ?? null,
                    'phone' => $memberData['phone'] ?? null,
                    'additional_phone' => $memberData['additional_phone'] ?? null,
                    'marital_status' => $memberData['marital_status'] ?? null,
                    'education_level' => $memberData['education_level'] ?? null,
                    'employment_status' => $memberData['employment_status'] ?? null,
                    'profession' => $memberData['profession'] ?? null,
                    'workplace' => $memberData['workplace'] ?? null,
                    'income_type' => $memberData['income_type'] ?? null,
                    'monthly_income' => $memberData['monthly_income'] ?? null,
                    'health_status' => $memberData['health_status'] ?? null,
                    'health_details' => $memberData['health_details'] ?? null,
                    'is_housewife' => (bool) ($memberData['is_housewife'] ?? false),
                    'kinship_degree' => $memberData['kinship_degree'] ?? null,
                    'orphan_status' => $memberData['orphan_status'] ?? null,
                    'is_head_of_family' => $relationship === FamilyRelationship::Head->value,
                    'family_relationship' => $relationship,
                    'notes' => $memberData['notes'] ?? null,
                ];

                if (! empty($memberData['id'])) {
                    $beneficiary = Beneficiary::query()
                        ->where('family_id', $family->id)
                        ->whereKey($memberData['id'])
                        ->firstOrFail();
                    $beneficiary->forceFill($payload)->save();
                    $keptIds[] = $beneficiary->id;
                } else {
                    $beneficiary = Beneficiary::query()->create(array_merge($payload, [
                        'family_id' => $family->id,
                    ]));
                    $keptIds[] = $beneficiary->id;
                }

                $this->assigner->assign($beneficiary);
            }

            Beneficiary::query()
                ->where('family_id', $family->id)
                ->whereNotIn('id', $keptIds)
                ->whereNull('user_id')
                ->delete();

            return $family->fresh()->load('beneficiaries.category');
        });
    }
}
