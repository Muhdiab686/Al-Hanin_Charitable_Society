<?php

use App\Http\Controllers\Api\AidRequestController;
use App\Http\Controllers\Api\VolunteerOpportunityController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/volunteer')->middleware(['auth:sanctum', 'role:volunteer'])->group(function () {
    Route::get('/aid-requests', [AidRequestController::class, 'index'])
        ->middleware('permission:aid.request.create');
    Route::post('/aid-requests', [AidRequestController::class, 'store'])
        ->middleware('permission:aid.request.create');

    Route::get('/opportunities', [VolunteerOpportunityController::class, 'index'])
        ->middleware('permission:volunteers.view');
    Route::post('/opportunities/{volunteerOpportunity}/register', [VolunteerOpportunityController::class, 'register']);
});
