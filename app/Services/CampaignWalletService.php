<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignWallet;
use App\Models\CampaignWalletTransaction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CampaignWalletService
{
    public function ensureWallet(Campaign $campaign): CampaignWallet
    {
        return CampaignWallet::query()->firstOrCreate(['campaign_id' => $campaign->id], ['balance' => 0]);
    }

    public function credit(
        Campaign $campaign,
        float $amount,
        string $source,
        ?Model $reference = null,
        ?int $recordedBy = null,
        ?string $description = null,
    ): CampaignWalletTransaction {
        return DB::transaction(function () use ($campaign, $amount, $source, $reference, $recordedBy, $description): CampaignWalletTransaction {
            $wallet = CampaignWallet::query()->lockForUpdate()->firstOrCreate(['campaign_id' => $campaign->id], ['balance' => 0]);

            $newBalance = round((float) $wallet->balance + $amount, 2);
            $wallet->forceFill(['balance' => $newBalance])->save();

            $transaction = CampaignWalletTransaction::query()->create([
                'campaign_wallet_id' => $wallet->id,
                'direction' => 'credit',
                'source' => $source,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'reference_type' => $reference?->getMorphClass(),
                'reference_id' => $reference?->getKey(),
                'description' => $description,
                'recorded_by' => $recordedBy,
                'recorded_at' => now(),
            ]);

            $campaign->increment('raised_amount', $amount);
            $campaign->refresh();
            $campaign->autoCompleteIfEligible();

            return $transaction;
        });
    }

    public function debit(
        Campaign $campaign,
        float $amount,
        string $source,
        ?Model $reference = null,
        ?int $recordedBy = null,
        ?string $description = null,
    ): CampaignWalletTransaction {
        return DB::transaction(function () use ($campaign, $amount, $source, $reference, $recordedBy, $description): CampaignWalletTransaction {
            $wallet = CampaignWallet::query()->lockForUpdate()->firstOrCreate(['campaign_id' => $campaign->id], ['balance' => 0]);

            if ($amount > (float) $wallet->balance) {
                throw ValidationException::withMessages([
                    'amount' => [__('Expense amount exceeds the campaign wallet balance.')],
                ]);
            }

            $newBalance = round((float) $wallet->balance - $amount, 2);
            $wallet->forceFill(['balance' => $newBalance])->save();

            $transaction = CampaignWalletTransaction::query()->create([
                'campaign_wallet_id' => $wallet->id,
                'direction' => 'debit',
                'source' => $source,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'reference_type' => $reference?->getMorphClass(),
                'reference_id' => $reference?->getKey(),
                'description' => $description,
                'recorded_by' => $recordedBy,
                'recorded_at' => now(),
            ]);

            $campaign->increment('spent_amount', $amount);

            return $transaction;
        });
    }
}
