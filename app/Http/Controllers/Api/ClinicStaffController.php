<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpsertClinicStaffProfileRequest;
use App\Models\ClinicStaffProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class ClinicStaffController extends Controller
{
    public function index(): JsonResponse
    {
        $profiles = ClinicStaffProfile::query()
            ->with('user:id,name,email,role')
            ->latest('id')
            ->paginate(15);

        return response()->json($profiles);
    }

    public function candidates(): JsonResponse
    {
        $existingUserIds = ClinicStaffProfile::query()->pluck('user_id');

        $users = User::query()
            ->whereIn('role', [UserRole::Doctor->value, UserRole::Secretary->value])
            ->when($existingUserIds->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $existingUserIds))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json(['candidates' => $users]);
    }

    public function upsert(UpsertClinicStaffProfileRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $role = UserRole::from($validated['role']);

        if (! in_array($role, [UserRole::Doctor, UserRole::Secretary], true)) {
            abort(422, 'Clinic staff role must be doctor or secretary.');
        }

        $user = User::query()->findOrFail($validated['user_id']);

        $protectedRoles = [
            UserRole::Admin,
            UserRole::Accountant,
            UserRole::Storekeeper,
            UserRole::Donor,
            UserRole::Volunteer,
            UserRole::Beneficiary,
            UserRole::RecordingSecretary,
        ];

        if (in_array($user->role, $protectedRoles, true)) {
            throw ValidationException::withMessages([
                'user_id' => [__('This account cannot be assigned to clinic staff (protected system role). Create a dedicated doctor user from admin users.')],
            ]);
        }

        if (! in_array($user->role, [UserRole::Doctor, UserRole::Secretary], true)) {
            $user->forceFill(['role' => $role])->save();
            $user->syncRoles([$role->value]);
        }

        $profile = ClinicStaffProfile::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'monthly_salary' => $validated['monthly_salary'],
                'consultation_fee' => $validated['consultation_fee'],
                'is_active' => $validated['is_active'],
            ]
        );

        return response()->json([
            'message' => __('Clinic staff profile saved successfully.'),
            'profile' => $profile->load('user:id,name,email,role'),
        ]);
    }
}
