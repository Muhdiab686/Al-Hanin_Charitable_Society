<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AidRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublishedAidRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->hasRole('donor')) {
            abort(403);
        }

        $requests = AidRequest::query()
            ->where('status', 'approved')
            ->whereNotNull('published_for_donors_at')
            ->with(['attachments:id,aid_request_id,original_name,mime_type'])
            ->latest('published_for_donors_at')
            ->paginate(15, [
                'id',
                'type',
                'public_title',
                'public_summary',
                'requested_amount',
                'published_for_donors_at',
            ]);

        return response()->json($requests);
    }
}
