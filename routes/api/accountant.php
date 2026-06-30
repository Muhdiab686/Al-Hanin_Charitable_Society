<?php

use App\Http\Controllers\Api\DoctorPayoutController;
use App\Http\Controllers\Api\DonorChatController;
use App\Http\Controllers\Api\FinanceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/accountant')->middleware(['auth:sanctum', 'role:accountant'])->group(function () {
    Route::get('/finance/summary', [FinanceController::class, 'summary'])
        ->middleware('permission:finance.reports.view');
    Route::get('/finance/expenses', [FinanceController::class, 'operationalExpenses'])
        ->middleware('permission:finance.expenses.manage');
    Route::post('/finance/expenses', [FinanceController::class, 'storeOperationalExpense'])
        ->middleware('permission:finance.expenses.manage');

    Route::get('/doctor-payout-requests', [DoctorPayoutController::class, 'index'])
        ->middleware('permission:finance.reports.view');
    Route::patch('/doctor-payout-requests/{doctorPayoutRequest}/review', [DoctorPayoutController::class, 'review'])
        ->middleware('permission:finance.expenses.manage');

    Route::prefix('communications/donor-chat')->middleware('permission:communications.donor_chat')->group(function () {
        Route::get('/donors', [DonorChatController::class, 'adminDonors']);
        Route::get('/donors/{donor}/messages', [DonorChatController::class, 'adminThread']);
        Route::post('/donors/{donor}/messages', [DonorChatController::class, 'adminStore']);
    });
});
