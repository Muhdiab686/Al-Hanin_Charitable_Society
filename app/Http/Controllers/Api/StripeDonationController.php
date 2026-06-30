<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateStripeCheckoutRequest;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\FinancialTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class StripeDonationController extends Controller
{
    public function createCheckoutSession(CreateStripeCheckoutRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $secretKey = config('services.stripe.secret');

        if (empty($secretKey)) {
            return response()->json([
                'message' => __('Stripe is not configured. Set STRIPE_SECRET in your environment.'),
            ], 503);
        }

        $amountCents = (int) round(((float) $validated['amount']) * 100);
        $showDonorName = (bool) ($validated['show_donor_name'] ?? true);
        $donorName = $showDonorName ? ($validated['donor_name'] ?? $request->user()->name) : 'متبرع مجهول';

        $donation = Donation::query()->create([
            'type' => 'cash',
            'channel' => 'stripe',
            'cash_amount' => $validated['amount'],
            'donor_name' => $donorName,
            'show_donor_name' => $showDonorName,
            'purpose' => $validated['purpose'] ?? null,
            'campaign_id' => $validated['campaign_id'] ?? null,
            'receipt_code' => 'RCP-'.Str::upper(Str::random(10)),
            'registered_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        $successUrl = $validated['success_url'] ?? config('app.url').'/app/donor/donations?stripe=success';
        $cancelUrl = $validated['cancel_url'] ?? config('app.url').'/app/donor/donations?stripe=cancel';

        $response = Http::withToken($secretKey)
            ->asForm()
            ->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode' => 'payment',
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'line_items[0][price_data][currency]' => config('services.stripe.currency', 'usd'),
                'line_items[0][price_data][product_data][name]' => $validated['purpose'] ?? 'تبرع لجمعية حنين',
                'line_items[0][price_data][unit_amount]' => $amountCents,
                'line_items[0][quantity]' => 1,
                'metadata[donation_id]' => $donation->id,
            ]);

        if (! $response->successful()) {
            $donation->delete();

            return response()->json([
                'message' => __('Failed to create Stripe checkout session.'),
                'error' => $response->json('error.message'),
            ], 502);
        }

        $sessionId = $response->json('id');
        $donation->forceFill(['stripe_checkout_session_id' => $sessionId])->save();

        return response()->json([
            'checkout_url' => $response->json('url'),
            'session_id' => $sessionId,
            'donation_id' => $donation->id,
        ], 201);
    }

    public function confirmCheckout(string $sessionId): JsonResponse
    {
        $secretKey = config('services.stripe.secret');

        if (empty($secretKey)) {
            return response()->json(['message' => __('Stripe is not configured.')], 503);
        }

        $donation = Donation::query()
            ->where('stripe_checkout_session_id', $sessionId)
            ->firstOrFail();

        $response = Http::withToken($secretKey)
            ->get('https://api.stripe.com/v1/checkout/sessions/'.$sessionId);

        if (! $response->successful() || $response->json('payment_status') !== 'paid') {
            return response()->json(['message' => __('Payment not completed.')], 422);
        }

        $paymentIntent = $response->json('payment_intent');
        $donation->forceFill(['stripe_payment_intent_id' => $paymentIntent])->save();

        if (! $donation->financialTransactions()->exists()) {
            FinancialTransaction::query()->create([
                'type' => 'income',
                'source' => 'donation',
                'amount' => $donation->cash_amount,
                'reference_type' => Donation::class,
                'reference_id' => $donation->id,
                'description' => 'تبرع إلكتروني — '.$donation->receipt_code,
                'recorded_by' => $donation->registered_by,
                'recorded_at' => now(),
            ]);

            if ($donation->campaign_id) {
                Campaign::query()
                    ->whereKey($donation->campaign_id)
                    ->increment('raised_amount', $donation->cash_amount);
            }
        }

        return response()->json([
            'message' => __('Donation confirmed successfully.'),
            'donation' => $donation->fresh(),
        ]);
    }
}
