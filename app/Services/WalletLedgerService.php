<?php

namespace App\Services;

use App\Enums\WalletEntryCategory;
use App\Models\Beneficiary;
use App\Models\ClinicStaffProfile;
use App\Models\FinancialTransaction;
use App\Models\User;
use App\Models\WalletEntry;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class WalletLedgerService
{
    public function creditBeneficiaryCash(
        Beneficiary $beneficiary,
        float $amount,
        WalletEntryCategory $category,
        Model $reference,
        string $description,
        ?User $recordedBy = null,
        ?FinancialTransaction $financialTransaction = null,
    ): WalletEntry {
        return DB::transaction(function () use (
            $beneficiary,
            $amount,
            $category,
            $reference,
            $description,
            $recordedBy,
            $financialTransaction,
        ): WalletEntry {
            $locked = Beneficiary::query()->lockForUpdate()->findOrFail($beneficiary->id);

            $locked->medical_wallet_balance = bcadd(
                (string) $locked->medical_wallet_balance,
                (string) $amount,
                2,
            );
            $locked->save();

            return $this->createEntry(
                ownerType: 'beneficiary',
                ownerId: (int) $locked->id,
                category: $category,
                direction: 'credit',
                amount: $amount,
                units: null,
                unitLabel: null,
                description: $description,
                reference: $reference,
                recordedBy: $recordedBy,
                financialTransaction: $financialTransaction,
            );
        });
    }

    public function recordBeneficiaryMaterialAid(
        Beneficiary $beneficiary,
        int $units,
        string $unitLabel,
        Model $reference,
        string $description,
        ?User $recordedBy = null,
        ?float $estimatedValue = null,
    ): WalletEntry {
        return $this->createEntry(
            ownerType: 'beneficiary',
            ownerId: (int) $beneficiary->id,
            category: WalletEntryCategory::MaterialAid,
            direction: 'credit',
            amount: $estimatedValue,
            units: $units,
            unitLabel: $unitLabel,
            description: $description,
            reference: $reference,
            recordedBy: $recordedBy,
            financialTransaction: null,
        );
    }

    public function creditDoctorPayout(
        User $doctor,
        float $amount,
        Model $reference,
        string $description,
        User $recordedBy,
        FinancialTransaction $financialTransaction,
    ): WalletEntry {
        return DB::transaction(function () use (
            $doctor,
            $amount,
            $reference,
            $description,
            $recordedBy,
            $financialTransaction,
        ): WalletEntry {
            $profile = ClinicStaffProfile::query()
                ->where('user_id', $doctor->id)
                ->lockForUpdate()
                ->firstOrFail();

            $profile->wallet_balance = bcadd(
                (string) $profile->wallet_balance,
                (string) $amount,
                2,
            );
            $profile->save();

            return $this->createEntry(
                ownerType: 'doctor',
                ownerId: (int) $doctor->id,
                category: WalletEntryCategory::DoctorPayout,
                direction: 'credit',
                amount: $amount,
                units: null,
                unitLabel: null,
                description: $description,
                reference: $reference,
                recordedBy: $recordedBy,
                financialTransaction: $financialTransaction,
            );
        });
    }

    /**
     * @return array{balance: string, entries: LengthAwarePaginator}
     */
    public function beneficiaryWalletPayload(Beneficiary $beneficiary): array
    {
        return [
            'balance' => number_format((float) $beneficiary->medical_wallet_balance, 2, '.', ''),
            'entries' => WalletEntry::query()
                ->where('owner_type', 'beneficiary')
                ->where('owner_id', $beneficiary->id)
                ->with(['recorder:id,name,email', 'reference'])
                ->latest('recorded_at')
                ->paginate(15),
        ];
    }

    /**
     * @return array{balance: string, entries: LengthAwarePaginator}
     */
    public function doctorWalletPayload(User $doctor): array
    {
        $profile = ClinicStaffProfile::query()->where('user_id', $doctor->id)->first();

        return [
            'balance' => number_format((float) ($profile?->wallet_balance ?? 0), 2, '.', ''),
            'entries' => WalletEntry::query()
                ->where('owner_type', 'doctor')
                ->where('owner_id', $doctor->id)
                ->with(['recorder:id,name,email', 'reference', 'financialTransaction:id,type,source,amount'])
                ->latest('recorded_at')
                ->paginate(15),
        ];
    }

    private function createEntry(
        string $ownerType,
        int $ownerId,
        WalletEntryCategory $category,
        string $direction,
        ?float $amount,
        ?int $units,
        ?string $unitLabel,
        string $description,
        Model $reference,
        ?User $recordedBy,
        ?FinancialTransaction $financialTransaction,
    ): WalletEntry {
        return WalletEntry::query()->create([
            'owner_type' => $ownerType,
            'owner_id' => $ownerId,
            'category' => $category->value,
            'direction' => $direction,
            'amount' => $amount,
            'units' => $units,
            'unit_label' => $unitLabel,
            'description' => $description,
            'reference_type' => $reference::class,
            'reference_id' => $reference->getKey(),
            'financial_transaction_id' => $financialTransaction?->id,
            'recorded_by' => $recordedBy?->id,
            'recorded_at' => now(),
        ]);
    }
}
