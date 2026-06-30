<?php

use App\Http\Controllers\Api\AidDistributionPlanController;
use App\Http\Controllers\Api\AidRequestController;
use App\Http\Controllers\Api\DonationController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\QrVerificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/storekeeper')->middleware(['auth:sanctum', 'role:storekeeper'])->group(function () {
    Route::get('/inventory-items', [InventoryController::class, 'index'])
        ->middleware('permission:inventory.view');
    Route::post('/inventory-items/{inventoryItem}/remove', [InventoryController::class, 'remove'])
        ->middleware('permission:inventory.manage');

    Route::get('/donations', [DonationController::class, 'index'])
        ->middleware('permission:donations.view');
    Route::post('/donations', [DonationController::class, 'store'])
        ->middleware('permission:donations.create');

    Route::get('/aid-distribution-plans', [AidDistributionPlanController::class, 'index'])
        ->middleware('permission:aid.distribute');
    Route::post('/aid-requests/{aidRequest}/inventory-distributions', [AidRequestController::class, 'storeInventoryDistribution'])
        ->middleware('permission:aid.distribute');
    Route::post('/aid-requests/{aidRequest}/deliveries', [AidRequestController::class, 'confirmDelivery'])
        ->middleware('permission:aid.distribute');

    Route::post('/qr/verify', [QrVerificationController::class, 'verify'])
        ->middleware('permission:aid.distribute');
});
