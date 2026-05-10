<?php

use App\Http\Controllers\Api\Admin\CampaignReportingController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\RoleCatalogController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AidDistributionPlanController;
use App\Http\Controllers\Api\AidRequestController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BeneficiaryController;
use App\Http\Controllers\Api\BeneficiaryLabReportController;
use App\Http\Controllers\Api\BeneficiaryMedicalWalletController;
use App\Http\Controllers\Api\CategoryRuleController;
use App\Http\Controllers\Api\ClinicStaffController;
use App\Http\Controllers\Api\DoctorPayoutController;
use App\Http\Controllers\Api\DonationController;
use App\Http\Controllers\Api\DonorChatController;
use App\Http\Controllers\Api\FamilyController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\MedicalRecordController;
use App\Http\Controllers\Api\QrVerificationController;
use App\Http\Controllers\Api\RoleOverviewController;
use App\Http\Controllers\Api\VolunteerOpportunityController;
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
    Route::get('/overview', [RoleOverviewController::class, 'show']);
    Route::get('/reporting/campaigns', [CampaignReportingController::class, 'index'])
        ->middleware('permission:finance.reports.view|volunteers.manage|donations.view');

    Route::prefix('admin')->middleware('permission:users.manage')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/roles', [RoleCatalogController::class, 'index']);
        Route::apiResource('users', AdminUserController::class)->except(['create', 'edit']);
    });

    Route::get('/beneficiaries', [BeneficiaryController::class, 'index'])
        ->middleware('permission:beneficiaries.view');
    Route::post('/beneficiaries', [BeneficiaryController::class, 'store'])
        ->middleware('permission:beneficiaries.manage');
    Route::get('/beneficiaries/{beneficiary}', [BeneficiaryController::class, 'show'])
        ->middleware('permission:beneficiaries.view');
    Route::patch('/beneficiaries/{beneficiary}', [BeneficiaryController::class, 'update'])
        ->middleware('permission:beneficiaries.manage');
    Route::post('/beneficiaries/{beneficiary}/recalculate-category', [BeneficiaryController::class, 'recalculateCategory'])
        ->middleware('permission:beneficiaries.manage|aid.request.review');
    Route::get('/beneficiaries/{beneficiary}/medical-wallet', [BeneficiaryMedicalWalletController::class, 'show'])
        ->middleware('permission:medical.records.view|medical.records.manage');
    Route::post('/beneficiaries/{beneficiary}/medical-wallet/credits', [BeneficiaryMedicalWalletController::class, 'credit'])
        ->middleware('permission:medical.records.manage');

    Route::get('/beneficiaries/{beneficiary}/lab-reports', [BeneficiaryLabReportController::class, 'index'])
        ->middleware('permission:beneficiaries.view|beneficiaries.manage');
    Route::post('/beneficiaries/{beneficiary}/lab-reports', [BeneficiaryLabReportController::class, 'store'])
        ->middleware('permission:beneficiaries.manage');

    Route::patch('/families/{family}/enrollment-status', [FamilyController::class, 'updateEnrollmentStatus'])
        ->middleware('permission:beneficiaries.manage|families.enrollment.review');
    Route::patch('/families/{family}/aid-eligibility', [FamilyController::class, 'updateAidEligibility'])
        ->middleware('permission:beneficiaries.manage|families.enrollment.review');
    Route::patch('/families/{family}', [FamilyController::class, 'updateProfile'])
        ->middleware('permission:beneficiaries.manage');

    Route::get('/families/{family}/qr-code', [FamilyController::class, 'qrCode']);

    Route::post('/qr/verify', [QrVerificationController::class, 'verify'])
        ->middleware('permission:beneficiaries.view|beneficiaries.manage|aid.distribute');

    Route::get('/aid-requests', [AidRequestController::class, 'index'])
        ->middleware('permission:aid.request.create|aid.request.review|aid.distribute');
    Route::post('/aid-requests', [AidRequestController::class, 'store'])
        ->middleware('permission:aid.request.create');
    Route::patch('/aid-requests/{aidRequest}/review', [AidRequestController::class, 'review'])
        ->middleware('permission:aid.request.review');
    Route::post('/aid-requests/{aidRequest}/inventory-distributions', [AidRequestController::class, 'storeInventoryDistribution'])
        ->middleware('permission:aid.distribute');
    Route::post('/aid-requests/{aidRequest}/deliveries', [AidRequestController::class, 'confirmDelivery'])
        ->middleware('permission:aid.distribute');

    Route::get('/aid-distribution-plans', [AidDistributionPlanController::class, 'index'])
        ->middleware('permission:aid.distribute|aid.request.review');
    Route::post('/aid-distribution-plans', [AidDistributionPlanController::class, 'store'])
        ->middleware('permission:aid.distribute|aid.request.review');

    Route::get('/categories/rules', [CategoryRuleController::class, 'index'])
        ->middleware('permission:beneficiaries.manage|aid.request.review');
    Route::put('/categories/{category}/rule', [CategoryRuleController::class, 'upsertRule'])
        ->middleware('permission:beneficiaries.manage');

    Route::get('/donations', [DonationController::class, 'index'])
        ->middleware('permission:donations.view|inventory.view');
    Route::post('/donations', [DonationController::class, 'store'])
        ->middleware('permission:donations.create');
    Route::get('/donations/{donation}', [DonationController::class, 'show'])
        ->middleware('permission:donations.view|inventory.view');

    Route::get('/inventory-items', [InventoryController::class, 'index'])
        ->middleware('permission:inventory.view');
    Route::post('/inventory-items/{inventoryItem}/remove', [InventoryController::class, 'remove'])
        ->middleware('permission:inventory.manage');

    Route::get('/clinic/staff', [ClinicStaffController::class, 'index'])
        ->middleware('permission:appointments.manage');
    Route::put('/clinic/staff', [ClinicStaffController::class, 'upsert'])
        ->middleware('permission:appointments.manage');

    Route::get('/appointments', [AppointmentController::class, 'index'])
        ->middleware('permission:appointments.view|appointments.manage');
    Route::post('/appointments', [AppointmentController::class, 'store'])
        ->middleware('permission:appointments.manage');
    Route::patch('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel'])
        ->middleware('permission:appointments.manage');

    Route::get('/medical-records', [MedicalRecordController::class, 'index'])
        ->middleware('permission:medical.records.view|medical.records.manage');
    Route::post('/medical-records', [MedicalRecordController::class, 'store'])
        ->middleware('permission:medical.records.manage');

    Route::get('/doctor-payout-requests', [DoctorPayoutController::class, 'index'])
        ->middleware('permission:finance.reports.view|finance.expenses.manage');
    Route::post('/doctor-payout-requests', [DoctorPayoutController::class, 'store'])
        ->middleware('permission:medical.records.manage');
    Route::patch('/doctor-payout-requests/{doctorPayoutRequest}/review', [DoctorPayoutController::class, 'review'])
        ->middleware('permission:finance.expenses.manage');
    Route::get('/finance/summary', [FinanceController::class, 'summary'])
        ->middleware('permission:finance.reports.view');
    Route::post('/finance/expenses', [FinanceController::class, 'storeOperationalExpense'])
        ->middleware('permission:finance.expenses.manage');

    Route::get('/volunteer-opportunities', [VolunteerOpportunityController::class, 'index'])
        ->middleware('permission:volunteers.view|volunteers.manage');
    Route::post('/volunteer-opportunities', [VolunteerOpportunityController::class, 'store'])
        ->middleware('permission:volunteers.manage');
    Route::patch(
        '/volunteer-opportunities/{volunteerOpportunity}/linked-beneficiaries',
        [VolunteerOpportunityController::class, 'syncLinkedBeneficiaries'],
    )->middleware('permission:volunteers.manage');
    Route::patch('/volunteer-opportunities/{volunteerOpportunity}', [VolunteerOpportunityController::class, 'update'])
        ->middleware('permission:volunteers.manage');
    Route::delete('/volunteer-opportunities/{volunteerOpportunity}', [VolunteerOpportunityController::class, 'destroy'])
        ->middleware('permission:volunteers.manage');
    Route::post('/volunteer-opportunities/{volunteerOpportunity}/register', [VolunteerOpportunityController::class, 'register'])
        ->middleware('auth:sanctum');

    Route::prefix('communications/donor-chat')->middleware('permission:communications.donor_chat')->group(function () {
        Route::get('/donors', [DonorChatController::class, 'adminDonors']);
        Route::get('/donors/{donor}/messages', [DonorChatController::class, 'adminThread']);
        Route::post('/donors/{donor}/messages', [DonorChatController::class, 'adminStore']);
    });

    Route::get('/donor-chat/messages', [DonorChatController::class, 'donorIndex']);
    Route::post('/donor-chat/messages', [DonorChatController::class, 'donorStore']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
