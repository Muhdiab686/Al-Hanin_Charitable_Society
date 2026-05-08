<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVolunteerOpportunityRequest;
use App\Http\Requests\UpdateVolunteerOpportunityRequest;
use App\Models\VolunteerOpportunity;
use App\Models\VolunteerOpportunityRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VolunteerOpportunityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = VolunteerOpportunity::query()
            ->withCount('registrations')
            ->with('creator:id,name,email')
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        return response()->json($query->paginate(15));
    }

    public function store(StoreVolunteerOpportunityRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $opportunity = VolunteerOpportunity::query()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'required_slots' => $validated['required_slots'],
            'filled_slots' => 0,
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'] ?? null,
            'status' => 'open',
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => __('Volunteer opportunity created successfully.'),
            'opportunity' => $opportunity->load('creator:id,name,email'),
        ], 201);
    }

    public function update(UpdateVolunteerOpportunityRequest $request, VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        $validated = $request->validated();

        if (isset($validated['required_slots']) && $validated['required_slots'] < $volunteerOpportunity->filled_slots) {
            throw ValidationException::withMessages([
                'required_slots' => [__('Required slots cannot be less than the current number of registrations.')],
            ]);
        }

        $volunteerOpportunity->forceFill($validated)->save();

        if ($volunteerOpportunity->filled_slots >= $volunteerOpportunity->required_slots) {
            $volunteerOpportunity->forceFill(['status' => 'closed'])->save();
        }

        return response()->json([
            'message' => __('Volunteer opportunity updated successfully.'),
            'opportunity' => $volunteerOpportunity->fresh()->load('creator:id,name,email'),
        ]);
    }

    public function destroy(VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        $volunteerOpportunity->delete();

        return response()->json([
            'message' => __('Volunteer opportunity deleted successfully.'),
        ]);
    }

    public function register(Request $request, VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        $registration = DB::transaction(function () use ($request, $volunteerOpportunity): VolunteerOpportunityRegistration {
            $opportunity = VolunteerOpportunity::query()
                ->whereKey($volunteerOpportunity->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($opportunity->status !== 'open') {
                throw ValidationException::withMessages([
                    'opportunity' => [__('This volunteer opportunity is closed.')],
                ]);
            }

            $alreadyRegistered = VolunteerOpportunityRegistration::query()
                ->where('volunteer_opportunity_id', $opportunity->id)
                ->where('user_id', $request->user()->id)
                ->exists();

            if ($alreadyRegistered) {
                throw ValidationException::withMessages([
                    'opportunity' => [__('You are already registered for this opportunity.')],
                ]);
            }

            if ($opportunity->filled_slots >= $opportunity->required_slots) {
                $opportunity->forceFill(['status' => 'closed'])->save();

                throw ValidationException::withMessages([
                    'opportunity' => [__('Registration is closed because all slots are filled.')],
                ]);
            }

            $registration = VolunteerOpportunityRegistration::query()->create([
                'volunteer_opportunity_id' => $opportunity->id,
                'user_id' => $request->user()->id,
                'registered_at' => now(),
            ]);

            $opportunity->increment('filled_slots');
            $opportunity->refresh();

            if ($opportunity->filled_slots >= $opportunity->required_slots) {
                $opportunity->forceFill(['status' => 'closed'])->save();
            }

            return $registration;
        });

        return response()->json([
            'message' => __('Registered successfully.'),
            'registration' => $registration->load('user:id,name,email'),
            'opportunity' => $volunteerOpportunity->fresh(),
        ], 201);
    }
}
