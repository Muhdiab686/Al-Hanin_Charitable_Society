<?php

namespace App\Services;

use App\Models\Beneficiary;
use App\Models\Category;
use App\Models\CategoryRule;

class BeneficiaryCategoryAssigner
{
    public function assign(Beneficiary $beneficiary): ?int
    {
        $beneficiary->loadMissing('family');

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

        return true;
    }

    private function hasMedicalCase(Beneficiary $beneficiary): bool
    {
        return $beneficiary->aidRequests()
            ->where('type', 'medical_prescription')
            ->exists() || (float) $beneficiary->medical_wallet_balance > 0;
    }
}
