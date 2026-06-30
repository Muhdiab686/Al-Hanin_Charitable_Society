<?php

namespace App\Http\Controllers\Api;

use App\Enums\DonorChatRecipient;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDonorChatMessageRequest;
use App\Models\DonorChatMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DonorChatController extends Controller
{
    public function adminDonors(Request $request): JsonResponse
    {
        $recipientRole = $this->resolveStaffRecipientRole($request);

        $donors = User::query()
            ->role(UserRole::Donor->value)
            ->orderBy('name')
            ->withCount([
                'donorChatMessagesReceived as messages_count' => fn ($q) => $q->where('recipient_role', $recipientRole),
            ])
            ->get(['id', 'name', 'email']);

        return response()->json([
            'recipient_role' => $recipientRole,
            'donors' => $donors->map(fn (User $u): array => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'messages_count' => (int) $u->messages_count,
            ]),
        ]);
    }

    public function adminThread(Request $request, User $donor): JsonResponse
    {
        abort_unless($donor->hasRole(UserRole::Donor->value), 404);

        $recipientRole = $this->resolveStaffRecipientRole($request);

        $messages = DonorChatMessage::query()
            ->where('donor_id', $donor->id)
            ->where('recipient_role', $recipientRole)
            ->with(['sender:id,name'])
            ->oldest()
            ->limit(500)
            ->get();

        return response()->json([
            'recipient_role' => $recipientRole,
            'messages' => $messages->map(fn (DonorChatMessage $m): array => self::serializeMessage($m)),
        ]);
    }

    public function adminStore(StoreDonorChatMessageRequest $request, User $donor): JsonResponse
    {
        abort_unless($donor->hasRole(UserRole::Donor->value), 404);

        $recipientRole = $this->resolveStaffRecipientRole($request);

        $message = DonorChatMessage::query()->create([
            'donor_id' => $donor->id,
            'recipient_role' => $recipientRole,
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

        $recipientRole = (string) $request->query('recipient_role', DonorChatRecipient::GeneralSecretary->value);

        $messages = DonorChatMessage::query()
            ->where('donor_id', $request->user()->id)
            ->where('recipient_role', $recipientRole)
            ->with(['sender:id,name'])
            ->oldest()
            ->limit(500)
            ->get();

        return response()->json([
            'recipient_role' => $recipientRole,
            'messages' => $messages->map(fn (DonorChatMessage $m): array => self::serializeMessage($m)),
        ]);
    }

    public function donorStore(Request $request): JsonResponse
    {
        $user = $request->user();
        $isDonor = $user instanceof User
            && ($user->role === UserRole::Donor || $user->hasRole(UserRole::Donor->value));
        abort_unless($isDonor, 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'recipient_role' => ['required', 'string', Rule::enum(DonorChatRecipient::class)],
        ]);

        $message = DonorChatMessage::query()->create([
            'donor_id' => $user->id,
            'recipient_role' => $validated['recipient_role'],
            'sender_id' => $user->id,
            'body' => $validated['body'],
        ]);

        $message->load('sender:id,name');

        return response()->json([
            'message' => self::serializeMessage($message),
        ], 201);
    }

    /**
     * @return array{id:int,body:string,is_from_donor:bool,recipient_role:string,created_at:string|null,sender:array{id:int,name:string}|null}
     */
    private static function serializeMessage(DonorChatMessage $m): array
    {
        /** @var User|null $sender */
        $sender = $m->sender;

        return [
            'id' => $m->id,
            'body' => $m->body,
            'recipient_role' => $m->recipient_role,
            'is_from_donor' => (int) $m->sender_id === (int) $m->donor_id,
            'created_at' => $m->created_at?->toIso8601String(),
            'sender' => $sender === null ? null : [
                'id' => $sender->id,
                'name' => $sender->name,
            ],
        ];
    }

    private function resolveStaffRecipientRole(Request $request): string
    {
        $user = $request->user();

        if ($user->role === UserRole::Accountant) {
            return DonorChatRecipient::Accountant->value;
        }

        if ($user->role === UserRole::RecordingSecretary) {
            return DonorChatRecipient::GeneralSecretary->value;
        }

        if ($user->role === UserRole::Admin) {
            return (string) $request->query('recipient_role', DonorChatRecipient::GeneralSecretary->value);
        }

        abort(403, __('You are not authorized to access donor chat.'));
    }
}
