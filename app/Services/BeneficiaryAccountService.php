<?php

namespace App\Services;

use App\Enums\BeneficiaryFollowUpStatus;
use App\Enums\FamilyEnrollmentStatus;
use App\Enums\FamilyRelationship;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\Family;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BeneficiaryAccountService
{
    public function linkUserToBeneficiary(User $user, ?Beneficiary $beneficiary = null): Beneficiary
    {
        if ($beneficiary !== null) {
            $beneficiary->forceFill(['user_id' => $user->id])->save();

            return $beneficiary;
        }

        $existing = Beneficiary::query()->where('user_id', $user->id)->first();

        if ($existing !== null) {
            return $existing;
        }

        return DB::transaction(function () use ($user): Beneficiary {
            $family = Family::query()->create([
                'family_code' => 'FAM-'.now()->format('YmdHis').'-'.fake()->numerify('####'),
                'registration_number' => $this->generateRegistrationNumber(),
                'registration_date' => now()->toDateString(),
                'head_name' => $user->name,
                'full_family_name' => $user->name,
                'members_count' => 1,
                'enrollment_status' => FamilyEnrollmentStatus::Draft,
                'follow_up_status' => BeneficiaryFollowUpStatus::UnderReview->value,
            ]);

            return Beneficiary::query()->create([
                'family_id' => $family->id,
                'user_id' => $user->id,
                'national_id' => 'USR-'.$user->id.'-'.Str::upper(Str::random(6)),
                'name' => $user->name,
                'is_head_of_family' => true,
                'family_relationship' => FamilyRelationship::Head->value,
                'status' => 'pending_profile',
            ]);
        });
    }

    /**
     * @param  array<string, mixed>  $familyData
     * @param  array<string, mixed>  $headData
     * @return array{user: User, beneficiary: Beneficiary, credentials: array{email: string, password: string}}
     */
    public function onboardWithGeneratedCredentials(array $familyData, array $headData, int $createdBy): array
    {
        return DB::transaction(function () use ($familyData, $headData, $createdBy): array {
            $email = $this->generateUniqueEmail($headData['name'] ?? $familyData['head_name'] ?? 'family');
            $password = Str::password(12);

            $user = User::query()->create([
                'name' => $headData['name'] ?? $familyData['head_name'],
                'email' => $email,
                'password' => Hash::make($password),
                'role' => UserRole::Beneficiary,
            ]);
            $user->syncRoles([UserRole::Beneficiary->value]);

            $family = Family::query()->create([
                'family_code' => 'FAM-'.now()->format('YmdHis').'-'.fake()->numerify('####'),
                'registration_number' => $this->generateRegistrationNumber(),
                'registration_date' => now()->toDateString(),
                'head_name' => $familyData['head_name'],
                'full_family_name' => $familyData['full_family_name'] ?? $familyData['head_name'],
                'phone' => $familyData['phone'] ?? null,
                'province' => $familyData['province'] ?? null,
                'city' => $familyData['city'] ?? null,
                'neighborhood' => $familyData['neighborhood'] ?? null,
                'address' => $familyData['address'] ?? null,
                'members_count' => $familyData['members_count'] ?? 1,
                'monthly_income' => $familyData['monthly_income'] ?? 0,
                'enrollment_status' => FamilyEnrollmentStatus::Draft,
                'follow_up_status' => BeneficiaryFollowUpStatus::UnderReview->value,
                'system_generated_credentials' => true,
            ]);

            $beneficiary = Beneficiary::query()->create([
                'family_id' => $family->id,
                'user_id' => $user->id,
                'national_id' => $headData['national_id'] ?? ('ONB-'.Str::upper(Str::random(8))),
                'name' => $headData['name'] ?? $familyData['head_name'],
                'phone' => $headData['phone'] ?? $familyData['phone'] ?? null,
                'date_of_birth' => $headData['date_of_birth'] ?? null,
                'gender' => $headData['gender'] ?? null,
                'is_head_of_family' => true,
                'family_relationship' => FamilyRelationship::Head->value,
                'status' => 'pending_profile',
                'notes' => 'Onboarded by staff #'.$createdBy,
            ]);

            return [
                'user' => $user,
                'beneficiary' => $beneficiary->load('family'),
                'credentials' => [
                    'email' => $email,
                    'password' => $password,
                ],
            ];
        });
    }

    public function resolveBeneficiaryIdForUser(User $user): ?int
    {
        return Beneficiary::query()->where('user_id', $user->id)->value('id');
    }

    public function generateRegistrationNumber(): string
    {
        do {
            $number = 'REG-'.now()->format('Y').'-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (Family::query()->where('registration_number', $number)->exists());

        return $number;
    }

    private function generateUniqueEmail(string $name): string
    {
        $slug = Str::slug($name, '.');
        $slug = $slug !== '' ? $slug : 'family';
        $base = Str::lower($slug).'@hanin-charity.local';
        $email = $base;
        $counter = 1;

        while (User::query()->where('email', $email)->exists()) {
            $email = $slug.$counter.'@hanin-charity.local';
            $counter++;
        }

        return $email;
    }
}
