<?php

use App\Http\Controllers\Api\AidRequestController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\Beneficiary\BeneficiaryAidWalletController;
use App\Http\Controllers\Api\Beneficiary\BeneficiaryDashboardController;
use App\Http\Controllers\Api\Beneficiary\BeneficiaryOnboardingController;
use App\Http\Controllers\Api\BeneficiaryMedicalWalletController;
use App\Http\Controllers\Api\MedicalRecordController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/beneficiary')->middleware(['auth:sanctum', 'role:beneficiary'])->group(function () {
    Route::get('/dashboard', [BeneficiaryDashboardController::class, 'show']);
    Route::get('/profile-status', [BeneficiaryOnboardingController::class, 'profileStatus']);
    Route::post('/profile/complete', [BeneficiaryOnboardingController::class, 'completeProfile']);

    Route::get('/aid-requests', [AidRequestController::class, 'index']);
    Route::post('/aid-requests', [AidRequestController::class, 'store']);
    Route::post('/aid-deliveries/confirm-by-qr', [AidRequestController::class, 'confirmBeneficiaryDeliveryByQr']);

    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::post('/appointments/request', [AppointmentController::class, 'requestAppointment']);

    Route::get('/medical-records', [MedicalRecordController::class, 'index']);
    Route::get('/medical-wallet', [BeneficiaryMedicalWalletController::class, 'showSelf']);
    Route::get('/aid-wallet', [BeneficiaryAidWalletController::class, 'show']);
});
