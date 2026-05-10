<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBeneficiaryLabReportRequest;
use App\Models\Beneficiary;
use App\Models\BeneficiaryLabReport;
use Illuminate\Http\JsonResponse;

class BeneficiaryLabReportController extends Controller
{
    public function index(Beneficiary $beneficiary): JsonResponse
    {
        $reports = BeneficiaryLabReport::query()
            ->where('beneficiary_id', $beneficiary->id)
            ->with('uploader:id,name,email')
            ->latest()
            ->paginate(20);

        return response()->json($reports);
    }

    public function store(StoreBeneficiaryLabReportRequest $request, Beneficiary $beneficiary): JsonResponse
    {
        $validated = $request->validated();

        $path = null;
        $original = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $original = $file->getClientOriginalName();
            $path = $file->store('lab-reports/'.$beneficiary->id, 'local');
        }

        $report = BeneficiaryLabReport::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'uploaded_by' => $request->user()?->id,
            'title' => $validated['title'],
            'findings' => $validated['findings'] ?? null,
            'attachment_path' => $path,
            'attachment_original_name' => $original,
        ]);

        return response()->json([
            'message' => __('Lab report stored.'),
            'report' => $report->load('uploader:id,name,email'),
        ], 201);
    }
}
