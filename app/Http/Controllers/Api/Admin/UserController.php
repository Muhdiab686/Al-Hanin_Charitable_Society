<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminUserRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', Rule::enum(UserRole::class)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = User::query()->latest();

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term): void {
                $q->where('name', 'like', '%'.$term.'%')
                    ->orWhere('email', 'like', '%'.$term.'%');
            });
        }

        if (! empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        $perPage = $filters['per_page'] ?? 15;

        /** @var LengthAwarePaginator<int, User> $paginator */
        $paginator = $query->paginate($perPage);

        return response()->json(
            $paginator->through(fn (User $user): array => $this->serializeUser($user))
        );
    }

    public function store(StoreAdminUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $role = UserRole::from($validated['role']);

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $role,
        ]);

        Role::findOrCreate($role->value);
        $user->syncRoles([$role->value]);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $this->serializeUser($user->fresh()),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'user' => $this->serializeUser($user),
        ]);
    }

    public function update(UpdateAdminUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        if (array_key_exists('name', $validated)) {
            $user->name = $validated['name'];
        }

        if (array_key_exists('email', $validated)) {
            $user->email = $validated['email'];
        }

        if (! empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        if (array_key_exists('role', $validated)) {
            $role = UserRole::from($validated['role']);
            $user->role = $role;
            Role::findOrCreate($role->value);
            $user->syncRoles([$role->value]);
        }

        $user->save();

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => $this->serializeUser($user->fresh()),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()?->id) {
            throw ValidationException::withMessages([
                'user' => [__('You cannot delete your own account.')],
            ]);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'roles' => $user->getRoleNames()->values()->all(),
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];
    }
}
