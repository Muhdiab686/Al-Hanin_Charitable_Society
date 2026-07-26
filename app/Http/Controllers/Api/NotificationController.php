<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = $user->notifications()->latest();

        $role = $user->role instanceof UserRole
            ? $user->role
            : UserRole::tryFrom((string) $user->getRawOriginal('role'));

        // إخفاء إشعارات الإدارة/العيادة القديمة التي وصلت بالخطأ إلى المستفيد
        if ($role === UserRole::Beneficiary) {
            $query->where(function ($builder): void {
                $builder
                    ->where('data->action_url', 'like', '/app/beneficiary%')
                    ->orWhere('data->action_url', 'like', '%/beneficiary/%');
            });
        }

        return response()->json($query->paginate(20));
    }

    public function markAsRead(Request $request, string $notification): JsonResponse
    {
        /** @var DatabaseNotification|null $record */
        $record = $request->user()
            ->notifications()
            ->whereKey($notification)
            ->first();

        abort_if($record === null, 404);
        $record->markAsRead();

        return response()->json([
            'message' => __('Notification marked as read.'),
            'notification' => $record->fresh(),
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'message' => __('All notifications marked as read.'),
        ]);
    }
}
