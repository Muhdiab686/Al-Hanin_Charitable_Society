<?php

use App\Http\Controllers\Api\AidRequestController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BeneficiaryController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('guest');
    Route::post('/login', [AuthController::class, 'login'])->middleware('guest');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);

        Route::middleware('role:admin')->get('/admin/ping', function () {
            return response()->json(['message' => 'Admin access granted.']);
        });
    });
});

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/beneficiaries', [BeneficiaryController::class, 'index'])
        ->middleware('permission:beneficiaries.view');
    Route::post('/beneficiaries', [BeneficiaryController::class, 'store'])
        ->middleware('permission:beneficiaries.manage');

    Route::get('/aid-requests', [AidRequestController::class, 'index'])
        ->middleware('permission:aid.request.create|aid.request.review');
    Route::post('/aid-requests', [AidRequestController::class, 'store'])
        ->middleware('permission:aid.request.create');
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
