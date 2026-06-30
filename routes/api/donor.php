<?php

use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\DonationController;
use App\Http\Controllers\Api\DonorChatController;
use App\Http\Controllers\Api\PublishedAidRequestController;
use App\Http\Controllers\Api\StripeDonationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/donor')->middleware(['auth:sanctum', 'role:donor'])->group(function () {
    Route::get('/campaigns', [CampaignController::class, 'publicIndex']);
    Route::get('/donations', [DonationController::class, 'index'])
        ->middleware('permission:donations.view');
    Route::post('/donations', [DonationController::class, 'store'])
        ->middleware('permission:donations.create');
    Route::post('/donations/stripe/checkout', [StripeDonationController::class, 'createCheckoutSession'])
        ->middleware('permission:donations.create');
    Route::post('/donations/stripe/confirm/{sessionId}', [StripeDonationController::class, 'confirmCheckout'])
        ->middleware('permission:donations.create');

    Route::get('/chat/messages', [DonorChatController::class, 'donorIndex']);
    Route::post('/chat/messages', [DonorChatController::class, 'donorStore']);

    Route::get('/urgent-aid', [PublishedAidRequestController::class, 'index']);
});
