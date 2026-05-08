<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\DonationType;
use App\Enums\FamilyEnrollmentStatus;
use App\Enums\InventoryItemStatus;
use App\Http\Controllers\Controller;
use App\Models\AidInventoryAllocation;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\Donation;
use App\Models\Family;
use App\Models\FinancialTransaction;
use App\Models\InventoryItem;
use App\Models\InventoryRemoval;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $familyStatusDefaults = collect(FamilyEnrollmentStatus::cases())
            ->mapWithKeys(fn (FamilyEnrollmentStatus $s): array => [$s->value => 0]);

        $familyStatusCounts = $familyStatusDefaults->merge(
            Family::query()
                ->toBase()
                ->select('enrollment_status')
                ->selectRaw('COUNT(*) as aggregate')
                ->groupBy('enrollment_status')
                ->get()
                ->mapWithKeys(fn ($row): array => [(string) $row->enrollment_status => (int) $row->aggregate])
        )->all();

        $aidByStatus = AidRequest::query()
            ->toBase()
            ->select('status')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row): array => [(string) $row->status => (int) $row->aggregate])
            ->all();

        $usersByRole = User::query()
            ->toBase()
            ->select('role')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('role')
            ->get()
            ->mapWithKeys(fn ($row): array => [(string) $row->role => (int) $row->aggregate])
            ->all();

        $donationTypeDefaults = collect(DonationType::cases())
            ->mapWithKeys(fn (DonationType $t): array => [$t->value => 0]);

        $donationsByType = $donationTypeDefaults->merge(
            Donation::query()
                ->toBase()
                ->select('type')
                ->selectRaw('COUNT(*) as aggregate')
                ->groupBy('type')
                ->get()
                ->mapWithKeys(fn ($row): array => [(string) $row->type => (int) $row->aggregate])
        )->all();

        $inventoryStatusDefaults = collect(InventoryItemStatus::cases())
            ->mapWithKeys(fn (InventoryItemStatus $s): array => [$s->value => 0]);

        $inventoryByStatus = $inventoryStatusDefaults->merge(
            InventoryItem::query()
                ->toBase()
                ->select('status')
                ->selectRaw('COUNT(*) as aggregate')
                ->groupBy('status')
                ->get()
                ->mapWithKeys(fn ($row): array => [(string) $row->status => (int) $row->aggregate])
        )->all();

        $monthlyConsumption = collect(range(1, 12))->map(function (int $month): array {
            $distributed = (int) AidInventoryAllocation::query()
                ->whereYear('created_at', now()->year)
                ->whereMonth('created_at', $month)
                ->sum('quantity');
            $removed = (int) InventoryRemoval::query()
                ->whereYear('removed_at', now()->year)
                ->whereMonth('removed_at', $month)
                ->sum('quantity');

            return [
                'month' => $month,
                'distributed' => $distributed,
                'removed' => $removed,
                'total_consumption' => $distributed + $removed,
            ];
        })->all();

        $aidDistributionTypeDefaults = collect([
            'health' => 0,
            'financial' => 0,
            'food' => 0,
        ]);

        $aidDistributionByType = $aidDistributionTypeDefaults->merge(
            AidRequest::query()
                ->toBase()
                ->selectRaw("
                    CASE
                        WHEN type = 'medical_prescription' THEN 'health'
                        WHEN type = 'urgent_financial' THEN 'financial'
                        WHEN type = 'special_item' THEN 'food'
                        ELSE 'food'
                    END as bucket
                ")
                ->selectRaw('COUNT(*) as aggregate')
                ->where('status', 'approved')
                ->groupBy('bucket')
                ->get()
                ->mapWithKeys(fn ($row): array => [(string) $row->bucket => (int) $row->aggregate])
        )->all();

        $donationsByChannel = collect(['web' => 0, 'manual' => 0])->merge(
            Donation::query()
                ->toBase()
                ->select('channel')
                ->selectRaw('COUNT(*) as aggregate')
                ->groupBy('channel')
                ->get()
                ->mapWithKeys(fn ($row): array => [(string) $row->channel => (int) $row->aggregate])
        )->all();

        $activeVolunteers = User::query()
            ->whereHas('roles', fn ($query) => $query->where('name', 'volunteer'))
            ->whereHas('volunteerRegistrations', fn ($query) => $query->whereDate('created_at', '>=', now()->subDays(30)))
            ->count();

        $incomeTotal = (float) FinancialTransaction::query()->where('type', 'income')->sum('amount');
        $expenseTotal = (float) FinancialTransaction::query()->where('type', 'expense')->sum('amount');

        return response()->json([
            'widgets' => [
                'sponsored_families' => Family::query()
                    ->where('enrollment_status', FamilyEnrollmentStatus::Approved->value)
                    ->count(),
                'cash_donations_this_month' => number_format((float) Donation::query()
                    ->where('type', DonationType::Cash->value)
                    ->whereYear('created_at', now()->year)
                    ->whereMonth('created_at', now()->month)
                    ->sum('cash_amount'), 2, '.', ''),
                'active_volunteers' => $activeVolunteers,
                'treasury_balance' => number_format($incomeTotal - $expenseTotal, 2, '.', ''),
            ],
            'families' => [
                'total' => Family::query()->count(),
                'by_enrollment_status' => $familyStatusCounts,
            ],
            'beneficiaries' => [
                'total' => Beneficiary::query()->count(),
            ],
            'aid_requests' => [
                'total' => AidRequest::query()->count(),
                'by_status' => $aidByStatus,
            ],
            'users' => [
                'total' => User::query()->count(),
                'by_role' => $usersByRole,
            ],
            'donations' => [
                'total' => Donation::query()->count(),
                'by_type' => $donationsByType,
            ],
            'inventory_items' => [
                'total' => InventoryItem::query()->count(),
                'by_status' => $inventoryByStatus,
            ],
            'analytics' => [
                'year' => now()->year,
                'warehouse_consumption_by_month' => $monthlyConsumption,
                'aid_distribution_by_type' => $aidDistributionByType,
                'donations_by_channel' => $donationsByChannel,
                'recent_donations' => Donation::query()
                    ->select(['id', 'receipt_code', 'type', 'channel', 'cash_amount', 'created_at'])
                    ->latest()
                    ->limit(5)
                    ->get(),
                'recent_aid_requests' => AidRequest::query()
                    ->with('beneficiary:id,name')
                    ->select(['id', 'beneficiary_id', 'type', 'status', 'created_at'])
                    ->latest()
                    ->limit(5)
                    ->get(),
            ],
        ]);
    }
}
