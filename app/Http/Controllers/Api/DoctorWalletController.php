<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WalletLedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorWalletController extends Controller
{
    public function showSelf(Request $request, WalletLedgerService $ledger): JsonResponse
    {
        return response()->json([
            'wallet' => $ledger->doctorWalletPayload($request->user()),
        ]);
    }
}
