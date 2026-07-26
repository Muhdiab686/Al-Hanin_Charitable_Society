<?php

namespace App\Services;

use App\Enums\HealthStatus;
use App\Models\Beneficiary;
use App\Models\Category;
use App\Models\CategoryRule;
use App\Models\Family;
use Carbon\Carbon;

class BeneficiaryCategoryAssigner
{
    /** A family member younger than this many months is considered a newborn (المواليد). */
    private const NEWBORN_MAX_AGE_MONTHS = 12;

    public function assign(Beneficiary $beneficiary): ?int
    {
        $beneficiary->loadMissing(['family.beneficiaries']);

        $categories = Category::query()
            ->with(['rules' => fn ($query) => $query->where('is_active', true)])
            ->orderBy('priority')
            ->get();

        foreach ($categories as $category) {
            foreach ($category->rules as $rule) {
                if (! $this->matchesRule($beneficiary, $rule)) {
                    continue;
                }

                $beneficiary->forceFill(['category_id' => $category->id])->save();

                return $category->id;
            }
        }

        $beneficiary->forceFill(['category_id' => null])->save();

        return null;
    }

    private function matchesRule(Beneficiary $beneficiary, CategoryRule $rule): bool
    {
        $family = $beneficiary->family;

        if ($family === null) {
            return false;
        }

        if ($rule->max_monthly_income !== null && (float) $family->monthly_income > (float) $rule->max_monthly_income) {
            return false;
        }

        if ($rule->min_family_members !== null && (int) $family->members_count < (int) $rule->min_family_members) {
            return false;
        }

        if ($rule->requires_medical_case && ! $this->hasMedicalCase($beneficiary)) {
            return false;
        }

        if ($rule->requires_health_condition && ! $this->hasHealthCondition($beneficiary)) {
            return false;
        }

        if ($rule->min_newborns !== null && $this->countNewborns($family) < (int) $rule->min_newborns) {
            return false;
        }

        if ($rule->housing_statuses !== null && $rule->housing_statuses !== []) {
            $familyHousing = strtolower(trim((string) ($family->housing_status ?? '')));
            $allowedStatuses = array_map(
                fn ($status): string => strtolower(trim((string) $status)),
                $rule->housing_statuses,
            );

            if ($familyHousing === '' || ! in_array($familyHousing, $allowedStatuses, true)) {
                return false;
            }
        }

        if ($rule->min_children_under_18 !== null && $this->countChildrenUnder18($family) < (int) $rule->min_children_under_18) {
            return false;
        }

        if ($rule->min_adults !== null && $this->countAdults($family) < (int) $rule->min_adults) {
            return false;
        }

        return true;
    }

    private function hasMedicalCase(Beneficiary $beneficiary): bool
    {
        return $beneficiary->aidRequests()
            ->whereIn('type', ['surgery', 'medical_prescription'])
            ->exists() || (float) $beneficiary->medical_wallet_balance > 0;
    }

    private function hasHealthCondition(Beneficiary $beneficiary): bool
    {
        if ($beneficiary->health_status === null || $beneficiary->health_status === '') {
            return false;
        }

        $status = $beneficiary->health_status instanceof HealthStatus
            ? $beneficiary->health_status
            : HealthStatus::tryFrom((string) $beneficiary->health_status);

        return $status !== null && $status !== HealthStatus::Healthy;
    }

    private function countNewborns(Family $family): int
    {
        return $family->beneficiaries->filter(function (Beneficiary $member): bool {
            if ($member->date_of_birth === null) {
                return false;
            }

            try {
                return Carbon::parse($member->date_of_birth)->diffInMonths(now()) < self::NEWBORN_MAX_AGE_MONTHS;
            } catch (\Throwable) {
                return false;
            }
        })->count();
    }

    private function countChildrenUnder18(Family $family): int
    {
        return $family->beneficiaries->filter(function (Beneficiary $member): bool {
            $age = $this->ageValue($member->age, $member->date_of_birth);

            return $age !== null && $age < 18;
        })->count();
    }

    private function countAdults(Family $family): int
    {
        return $family->beneficiaries->filter(function (Beneficiary $member): bool {
            $age = $this->ageValue($member->age, $member->date_of_birth);

            return $age !== null && $age >= 18;
        })->count();
    }

    private function ageValue(mixed $age, mixed $dateOfBirth): ?int
    {
        if ($age !== null) {
            return (int) $age;
        }

        if ($dateOfBirth === null) {
            return null;
        }

        try {
            return Carbon::parse($dateOfBirth)->age;
        } catch (\Throwable) {
            return null;
        }
    }
}
