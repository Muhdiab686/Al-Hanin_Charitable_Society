<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDonorChatMessageRequest;
use App\Models\DonorChatMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DonorChatController extends Controller
{
    public function adminDonors(): JsonResponse
    {
        $donors = User::query()
            ->role(UserRole::Donor->value)
            ->orderBy('name')
            ->withCount('donorChatMessagesReceived as messages_count')
            ->get(['id', 'name', 'email']);

        return response()->json([
            'donors' => $donors->map(fn (User $u): array => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'messages_count' => (int) $u->messages_count,
            ]),
        ]);
    }

    public function adminThread(User $donor): JsonResponse
    {
        abort_unless($donor->hasRole(UserRole::Donor->value), 404);

        $messages = DonorChatMessage::query()
            ->where('donor_id', $donor->id)
            ->with(['sender:id,name'])
            ->oldest()
            ->limit(500)
            ->get();

        return response()->json([
            'messages' => $messages->map(fn (DonorChatMessage $m): array => self::serializeMessage($m)),
        ]);
    }

    public function adminStore(StoreDonorChatMessageRequest $request, User $donor): JsonResponse
    {
        abort_unless($donor->hasRole(UserRole::Donor->value), 404);

        $message = DonorChatMessage::query()->create([
            'donor_id' => $donor->id,
            'sender_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        $message->load('sender:id,name');

        return response()->json([
            'message' => self::serializeMessage($message),
        ], 201);
    }

    public function donorIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        $isDonor = $user instanceof User
            && ($user->role === UserRole::Donor || $user->hasRole(UserRole::Donor->value));
        abort_unless($isDonor, 403);

        $messages = DonorChatMessage::query()
            ->where('donor_id', $request->user()->id)
            ->with(['sender:id,name'])
            ->oldest()
            ->limit(500)
            ->get();

        return response()->json([
            'messages' => $messages->map(fn (DonorChatMessage $m): array => self::serializeMessage($m)),
        ]);
    }

    public function donorStore(StoreDonorChatMessageRequest $request): JsonResponse
    {
        $user = $request->user();
        $isDonor = $user instanceof User
            && ($user->role === UserRole::Donor || $user->hasRole(UserRole::Donor->value));
        abort_unless($isDonor, 403);

        $message = DonorChatMessage::query()->create([
            'donor_id' => $user->id,
            'sender_id' => $user->id,
            'body' => $request->validated('body'),
        ]);

        $message->load('sender:id,name');

        return response()->json([
            'message' => self::serializeMessage($message),
        ], 201);
    }

    /**
     * @return array{id:int,body:string,is_from_donor:bool,created_at:string|null,sender:array{id:int,name:string}|null}
     */
    private static function serializeMessage(DonorChatMessage $m): array
    {
        /** @var User|null $sender */
        $sender = $m->sender;

        return [
            'id' => $m->id,
            'body' => $m->body,
            'is_from_donor' => (int) $m->sender_id === (int) $m->donor_id,
            'created_at' => $m->created_at?->toIso8601String(),
            'sender' => $sender === null ? null : [
                'id' => $sender->id,
                'name' => $sender->name,
            ],
        ];
    }
}
