<?php

namespace App\Http\Controllers\Api\Beneficiary;

use App\Http\Controllers\Controller;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BeneficiaryDashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $beneficiary = $this->resolveBeneficiary($request);

        $upcomingAppointments = ClinicAppointment::query()
            ->where('beneficiary_id', $beneficiary->id)
            ->where('scheduled_at', '>=', now())
            ->whereIn('workflow_status', ['scheduled', 'pending_approval'])
            ->with(['doctor:id,name', 'doctor.clinicStaffProfile:user_id,specialty'])
            ->orderBy('scheduled_at')
            ->limit(10)
            ->get();

        $requestedMaterials = AidRequest::query()
            ->where('beneficiary_id', $beneficiary->id)
            ->latest()
            ->limit(10)
            ->get(['id', 'aid_type', 'status', 'created_at', 'description']);

        $family = $beneficiary->family;

        return response()->json([
            'beneficiary_id' => $beneficiary->id,
            'family_id' => $beneficiary->family_id,
            'status' => [
                'enrollment_status' => $family?->enrollment_status?->value,
                'follow_up_status' => $family?->follow_up_status,
                'profile_completed' => $family?->profile_completed_at !== null,
            ],
            'upcoming_appointments' => $upcomingAppointments,
            'requested_materials' => $requestedMaterials,
        ]);
    }

    private function resolveBeneficiary(Request $request): Beneficiary
    {
        $beneficiary = Beneficiary::query()
            ->where('user_id', $request->user()->id)
            ->with('family')
            ->first();

        abort_if($beneficiary === null, 404, __('No beneficiary profile linked to this account.'));

        return $beneficiary;
    }
}
