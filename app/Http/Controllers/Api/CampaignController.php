<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCampaignRequest;
use App\Http\Requests\UpdateCampaignRequest;
use App\Models\Campaign;
use App\Services\CampaignWalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CampaignController extends Controller
{
    public function index(): JsonResponse
    {
        $this->syncAutoCompletedCampaigns();

        $campaigns = Campaign::query()
            ->with('creator:id,name')
            ->latest()
            ->paginate(15);

        $campaigns->getCollection()->transform(function (Campaign $campaign): array {
            return $this->serializeCampaign($campaign);
        });

        return response()->json($campaigns);
    }

    public function store(StoreCampaignRequest $request, CampaignWalletService $wallets): JsonResponse
    {
        $validated = $request->validated();

        $campaign = Campaign::query()->create([
            ...$validated,
            'campaign_code' => $this->uniqueCampaignCode(),
            'status' => 'draft',
            'created_by' => $request->user()->id,
        ]);

        $wallets->ensureWallet($campaign);

        return response()->json([
            'message' => __('Campaign created successfully as a draft. Publish it to make it visible to donors.'),
            'campaign' => $this->serializeCampaign($campaign->fresh()->load('creator:id,name')),
        ], 201);
    }

    public function show(Campaign $campaign): JsonResponse
    {
        $campaign->autoCompleteIfEligible();

        return response()->json([
            'campaign' => $this->serializeCampaign($campaign->fresh()->load('creator:id,name')),
        ]);
    }

    public function update(UpdateCampaignRequest $request, Campaign $campaign): JsonResponse
    {
        if ($campaign->status !== 'draft') {
            throw ValidationException::withMessages([
                'campaign' => [__('Only draft campaigns can be edited. Close or duplicate a published campaign instead.')],
            ]);
        }

        $campaign->forceFill($request->validated())->save();

        return response()->json([
            'message' => __('Campaign updated successfully.'),
            'campaign' => $this->serializeCampaign($campaign->fresh()->load('creator:id,name')),
        ]);
    }

    public function publish(Campaign $campaign): JsonResponse
    {
        if ($campaign->status !== 'draft') {
            throw ValidationException::withMessages([
                'campaign' => [__('Only draft campaigns can be published.')],
            ]);
        }

        $campaign->forceFill([
            'status' => 'active',
            'published_at' => now(),
        ])->save();

        return response()->json([
            'message' => __('Campaign published successfully. It is now visible to donors.'),
            'campaign' => $this->serializeCampaign($campaign->fresh()->load('creator:id,name')),
        ]);
    }

    public function close(Campaign $campaign): JsonResponse
    {
        if (! in_array($campaign->status, ['active', 'completed'], true)) {
            throw ValidationException::withMessages([
                'campaign' => [__('Only active or completed campaigns can be closed.')],
            ]);
        }

        $campaign->forceFill([
            'status' => 'closed',
            'closed_at' => now(),
        ])->save();

        return response()->json([
            'message' => __('Campaign closed successfully. Expense invoices can still be recorded against its wallet.'),
            'campaign' => $this->serializeCampaign($campaign->fresh()->load('creator:id,name')),
        ]);
    }

    public function wallet(Campaign $campaign, CampaignWalletService $wallets): JsonResponse
    {
        $wallet = $wallets->ensureWallet($campaign)->load([
            'transactions' => fn ($query) => $query->latest('recorded_at'),
            'transactions.recorder:id,name,email',
        ]);

        return response()->json([
            'campaign' => $this->serializeCampaign($campaign->fresh()),
            'wallet' => [
                'id' => $wallet->id,
                'balance' => $wallet->balance,
                'transactions' => $wallet->transactions,
            ],
        ]);
    }

    public function publicIndex(Request $request): JsonResponse
    {
        $this->syncAutoCompletedCampaigns();

        $campaigns = Campaign::query()
            ->where('status', 'active')
            ->orderByDesc('starts_at')
            ->get()
            ->map(fn (Campaign $c): array => $this->serializeCampaign($c));

        return response()->json(['campaigns' => $campaigns]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCampaign(Campaign $campaign): array
    {
        return [
            'id' => $campaign->id,
            'campaign_code' => $campaign->campaign_code,
            'title' => $campaign->title,
            'description' => $campaign->description,
            'goal_amount' => $campaign->goal_amount,
            'raised_amount' => $campaign->raised_amount,
            'spent_amount' => $campaign->spent_amount,
            'wallet_balance' => $campaign->walletBalance(),
            'progress_percentage' => $campaign->progressPercentage(),
            'status' => $campaign->status,
            'starts_at' => $campaign->starts_at?->toDateString(),
            'ends_at' => $campaign->ends_at?->toDateString(),
            'published_at' => $campaign->published_at?->toIso8601String(),
            'closed_at' => $campaign->closed_at?->toIso8601String(),
            'image_url' => $campaign->image_url,
            'creator' => $campaign->creator,
        ];
    }

    private function syncAutoCompletedCampaigns(): void
    {
        Campaign::query()
            ->where('status', 'active')
            ->where(function ($query): void {
                $query->whereColumn('raised_amount', '>=', 'goal_amount')
                    ->orWhereDate('ends_at', '<', now()->toDateString());
            })
            ->update(['status' => 'completed']);
    }

    private function uniqueCampaignCode(): string
    {
        do {
            $code = 'CMP-'.Str::upper(Str::random(8));
        } while (Campaign::query()->where('campaign_code', $code)->exists());

        return $code;
    }
}
