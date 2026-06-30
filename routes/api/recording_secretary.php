<?php

use App\Http\Controllers\Api\AidDistributionPlanController;
use App\Http\Controllers\Api\Beneficiary\BeneficiaryOnboardingController;
use App\Http\Controllers\Api\BeneficiaryController;
use App\Http\Controllers\Api\BeneficiaryLabReportController;
use App\Http\Controllers\Api\BeneficiaryMedicalWalletController;
use App\Http\Controllers\Api\CategoryRuleController;
use App\Http\Controllers\Api\DonorChatController;
use App\Http\Controllers\Api\FamilyController;
use App\Http\Controllers\Api\QrVerificationController;
use App\Http\Controllers\Api\VolunteerOpportunityController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/recording-secretary')->middleware(['auth:sanctum', 'role:recording_secretary'])->group(function () {
    Route::get('/beneficiaries', [BeneficiaryController::class, 'index'])
        ->middleware('permission:beneficiaries.view');
    Route::post('/beneficiaries', [BeneficiaryController::class, 'store'])
        ->middleware('permission:beneficiaries.manage');
    Route::get('/beneficiaries/{beneficiary}', [BeneficiaryController::class, 'show'])
        ->middleware('permission:beneficiaries.view');
    Route::patch('/beneficiaries/{beneficiary}', [BeneficiaryController::class, 'update'])
        ->middleware('permission:beneficiaries.manage');
    Route::post('/beneficiaries/onboard', [BeneficiaryOnboardingController::class, 'onboard'])
        ->middleware('permission:beneficiaries.manage');

    Route::patch('/families/{family}/enrollment-status', [FamilyController::class, 'updateEnrollmentStatus'])
        ->middleware('permission:families.enrollment.review');
    Route::post('/families/{family}/approve', [BeneficiaryOnboardingController::class, 'approve'])
        ->middleware('permission:families.enrollment.review');
    Route::patch('/families/{family}', [FamilyController::class, 'updateProfile'])
        ->middleware('permission:beneficiaries.manage');
    Route::get('/families/{family}/members', [FamilyController::class, 'members'])
        ->middleware('permission:beneficiaries.view');
    Route::post('/families/{family}/members', [FamilyController::class, 'storeMember'])
        ->middleware('permission:beneficiaries.manage');

    Route::get('/aid-distribution-plans', [AidDistributionPlanController::class, 'index'])
        ->middleware('permission:aid.distribute|aid.request.review');
    Route::post('/aid-distribution-plans', [AidDistributionPlanController::class, 'store'])
        ->middleware('permission:aid.distribute|aid.request.review');

    Route::get('/categories/rules', [CategoryRuleController::class, 'index'])
        ->middleware('permission:beneficiaries.manage');
    Route::put('/categories/{category}/rule', [CategoryRuleController::class, 'upsertRule'])
        ->middleware('permission:beneficiaries.manage');

    Route::get('/beneficiaries/{beneficiary}/medical-wallet', [BeneficiaryMedicalWalletController::class, 'show'])
        ->middleware('permission:medical.records.view');
    Route::get('/beneficiaries/{beneficiary}/lab-reports', [BeneficiaryLabReportController::class, 'index'])
        ->middleware('permission:beneficiaries.view');

    Route::prefix('communications/donor-chat')->middleware('permission:communications.donor_chat')->group(function () {
        Route::get('/donors', [DonorChatController::class, 'adminDonors']);
        Route::get('/donors/{donor}/messages', [DonorChatController::class, 'adminThread']);
        Route::post('/donors/{donor}/messages', [DonorChatController::class, 'adminStore']);
    });

    Route::get('/volunteer-opportunities', [VolunteerOpportunityController::class, 'index'])
        ->middleware('permission:volunteers.view');
    Route::post('/qr/verify', [QrVerificationController::class, 'verify'])
        ->middleware('permission:beneficiaries.view');
});
