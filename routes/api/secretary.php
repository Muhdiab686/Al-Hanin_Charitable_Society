<?php

use App\Http\Controllers\Api\AidRequestController;
use App\Http\Controllers\Api\AppointmentController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/secretary')->middleware(['auth:sanctum', 'role:secretary'])->group(function () {
    Route::get('/appointments', [AppointmentController::class, 'index'])
        ->middleware('permission:appointments.view|appointments.manage');
    Route::post('/appointments', [AppointmentController::class, 'store'])
        ->middleware('permission:appointments.manage');
    Route::patch('/appointments/{appointment}/approve', [AppointmentController::class, 'approve'])
        ->middleware('permission:appointments.manage');
    Route::patch('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel'])
        ->middleware('permission:appointments.manage');

    Route::get('/aid-requests', [AidRequestController::class, 'index'])
        ->middleware('permission:aid.request.review');
    Route::patch('/aid-requests/{aidRequest}/review', [AidRequestController::class, 'review'])
        ->middleware('permission:aid.request.review');
});
