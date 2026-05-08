<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

class RoleCatalogController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::query()
            ->with(['permissions:id,name'])
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role): array => [
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->sort()->values()->all(),
            ]);

        return response()->json([
            'roles' => $roles,
            'assignable_roles' => collect(UserRole::cases())
                ->map(fn (UserRole $r): array => [
                    'value' => $r->value,
                    'case' => $r->name,
                ])
                ->values()
                ->all(),
        ]);
    }
}
