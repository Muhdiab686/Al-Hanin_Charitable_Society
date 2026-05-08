<?php

use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\RoleCatalogController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use Illuminate\Support\Facades\Route;
use Livewire\Volt\Volt;

Route::get('/', function () {
    return view('welcome');
})->name('home');

Route::view('dashboard', 'dashboard')
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::get('dashboard/data', [AdminDashboardController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:users.manage'])
    ->name('dashboard.data');

Route::get('dashboard/roles', [RoleCatalogController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:users.manage'])
    ->name('dashboard.roles');

Route::get('dashboard/users', [AdminUserController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:users.manage'])
    ->name('dashboard.users.index');

Route::post('dashboard/users', [AdminUserController::class, 'store'])
    ->middleware(['auth', 'verified', 'permission:users.manage'])
    ->name('dashboard.users.store');

Route::patch('dashboard/users/{user}', [AdminUserController::class, 'update'])
    ->middleware(['auth', 'verified', 'permission:users.manage'])
    ->name('dashboard.users.update');

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', 'settings/profile');

    Volt::route('settings/profile', 'settings.profile')->name('settings.profile');
    Volt::route('settings/password', 'settings.password')->name('settings.password');
    Volt::route('settings/appearance', 'settings.appearance')->name('settings.appearance');
});

require __DIR__.'/auth.php';
