<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOperationalExpenseRequest;
use App\Models\FinancialTransaction;
use App\Models\OperationalExpense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    public function storeOperationalExpense(StoreOperationalExpenseRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $transaction = DB::transaction(function () use ($request, $validated): FinancialTransaction {
            $voucher = OperationalExpense::query()->create([
                'invoice_reference' => $validated['invoice_reference'] ?? null,
                'vendor' => $validated['vendor'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            return FinancialTransaction::query()->create([
                'type' => 'expense',
                'source' => 'operational_invoice',
                'amount' => $validated['amount'],
                'reference_type' => OperationalExpense::class,
                'reference_id' => $voucher->id,
                'description' => $validated['description'] ?? ('مصروف تشغيلي #'.$voucher->id),
                'recorded_by' => $request->user()->id,
                'recorded_at' => now(),
            ]);
        });

        return response()->json([
            'message' => __('Expense recorded successfully.'),
            'transaction' => $transaction->fresh()->load(['recorder:id,name,email']),
        ], 201);
    }

    public function operationalExpenses(Request $request): JsonResponse
    {
        $query = FinancialTransaction::query()
            ->where('type', 'expense')
            ->where('source', 'operational_invoice')
            ->with(['recorder:id,name,email', 'reference'])
            ->latest('recorded_at');

        if ($request->filled('from')) {
            $query->whereDate('recorded_at', '>=', (string) $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('recorded_at', '<=', (string) $request->string('to'));
        }

        return response()->json($query->paginate(15));
    }
}
