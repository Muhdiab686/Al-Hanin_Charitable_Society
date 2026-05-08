<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinancialTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $transactions = FinancialTransaction::query();

        if ($request->filled('from')) {
            $transactions->whereDate('recorded_at', '>=', (string) $request->string('from'));
        }

        if ($request->filled('to')) {
            $transactions->whereDate('recorded_at', '<=', (string) $request->string('to'));
        }

        $income = (clone $transactions)
            ->where('type', 'income')
            ->sum('amount');

        $expenses = (clone $transactions)
            ->where('type', 'expense')
            ->sum('amount');

        $net = (float) $income - (float) $expenses;

        $latestTransactions = (clone $transactions)
            ->with('recorder:id,name,email')
            ->latest('recorded_at')
            ->limit(20)
            ->get();

        return response()->json([
            'totals' => [
                'income' => number_format((float) $income, 2, '.', ''),
                'expenses' => number_format((float) $expenses, 2, '.', ''),
                'net' => number_format($net, 2, '.', ''),
            ],
            'transactions' => $latestTransactions,
        ]);
    }
}
