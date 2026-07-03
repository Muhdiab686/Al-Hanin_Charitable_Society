<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCampaignRequest;
use App\Models\Campaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    public function store(StoreCampaignRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $campaign = Campaign::query()->create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);
        $campaign->autoCompleteIfEligible();

        return response()->json([
            'message' => __('Campaign created successfully.'),
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
}
