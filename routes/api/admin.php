<?php

use App\Http\Controllers\Api\Admin\CampaignReportingController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\RoleCatalogController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Beneficiary\BeneficiaryOnboardingController;
use App\Http\Controllers\Api\BeneficiaryController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\DonorChatController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/admin')->middleware(['auth:sanctum', 'permission:users.manage'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/roles', [RoleCatalogController::class, 'index']);
    Route::apiResource('users', AdminUserController::class)->except(['create', 'edit']);

    Route::get('/beneficiaries', [BeneficiaryController::class, 'index'])
        ->middleware('permission:beneficiaries.view');
    Route::post('/beneficiaries', [BeneficiaryController::class, 'store'])
        ->middleware('permission:beneficiaries.manage');
    Route::post('/beneficiaries/onboard', [BeneficiaryOnboardingController::class, 'onboard'])
        ->middleware('permission:beneficiaries.manage');
    Route::post('/families/{family}/approve', [BeneficiaryOnboardingController::class, 'approve'])
        ->middleware('permission:families.enrollment.review');

    Route::get('/campaigns', [CampaignController::class, 'index']);
    Route::post('/campaigns', [CampaignController::class, 'store']);
    Route::get('/campaigns/{campaign}', [CampaignController::class, 'show']);

    Route::get('/reporting/campaigns', [CampaignReportingController::class, 'index'])
        ->middleware('permission:finance.reports.view');

    Route::prefix('communications/donor-chat')->middleware('permission:communications.donor_chat')->group(function () {
        Route::get('/donors', [DonorChatController::class, 'adminDonors']);
        Route::get('/donors/{donor}/messages', [DonorChatController::class, 'adminThread']);
        Route::post('/donors/{donor}/messages', [DonorChatController::class, 'adminStore']);
    });
});

// Legacy admin paths (backward compatible)
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/reporting/campaigns', [CampaignReportingController::class, 'index'])
        ->middleware('permission:finance.reports.view|volunteers.manage|donations.view');
});
