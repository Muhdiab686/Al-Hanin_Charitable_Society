<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\SystemDatabaseNotification;
use Illuminate\Support\Collection;

class AppNotificationService
{
    /**
     * @param  list<string>  $roles
     * @param  array<string, mixed>  $meta
     */
    public function notifyRoles(
        array $roles,
        string $title,
        string $message,
        ?string $actionUrl = null,
        array $meta = [],
    ): void {
        if ($roles === []) {
            return;
        }

        $users = User::query()
            ->get()
            ->filter(function (User $user) use ($roles): bool {
                $role = (string) $user->getRawOriginal('role');

                return in_array($role, $roles, true) || $user->hasAnyRole($roles);
            })
            ->values();

        $this->notifyUsers($users, $title, $message, $actionUrl, $meta);
    }

    /**
     * @param  Collection<int, User>  $users
     * @param  array<string, mixed>  $meta
     */
    public function notifyUsers(
        Collection $users,
        string $title,
        string $message,
        ?string $actionUrl = null,
        array $meta = [],
    ): void {
        if ($users->isEmpty()) {
            return;
        }

        $notification = new SystemDatabaseNotification($title, $message, $actionUrl, $meta);
        $users->each(fn (User $user) => $user->notify($notification));
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public function notifyUser(
        ?User $user,
        string $title,
        string $message,
        ?string $actionUrl = null,
        array $meta = [],
    ): void {
        if ($user === null) {
            return;
        }

        $user->notify(new SystemDatabaseNotification($title, $message, $actionUrl, $meta));
    }
}
