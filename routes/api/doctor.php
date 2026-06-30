<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\DoctorPayoutController;
use App\Http\Controllers\Api\MedicalRecordController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/doctor')->middleware(['auth:sanctum', 'role:doctor'])->group(function () {
    Route::get('/appointments', [AppointmentController::class, 'index'])
        ->middleware('permission:appointments.view');
    Route::patch('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel'])
        ->middleware('permission:appointments.view');

    Route::get('/medical-records', [MedicalRecordController::class, 'index'])
        ->middleware('permission:medical.records.view');
    Route::post('/medical-records', [MedicalRecordController::class, 'store'])
        ->middleware('permission:medical.records.manage');

    Route::get('/payout-requests', [DoctorPayoutController::class, 'index'])
        ->middleware('permission:medical.records.manage');
    Route::post('/payout-requests', [DoctorPayoutController::class, 'store'])
        ->middleware('permission:medical.records.manage');
});
