<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\DonationType;
use App\Enums\VolunteerActivityKind;
use App\Http\Controllers\Controller;
use App\Models\Donation;
use App\Models\InventoryItem;
use App\Models\VolunteerOpportunity;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CampaignReportingController extends Controller
{
    public function index(): JsonResponse
    {
        $cashRows = Donation::query()
            ->toBase()
            ->selectRaw("COALESCE(NULLIF(TRIM(purpose), ''), '__uncategorized') as bucket")
            ->selectRaw('COUNT(*) as donations_count')
            ->selectRaw('COALESCE(SUM(cash_amount), 0) as total_cash')
            ->where('type', DonationType::Cash->value)
            ->groupBy('bucket')
            ->orderByDesc('total_cash')
            ->get();

        $cashByCampaignTag = $cashRows->map(function ($row): array {
            $key = (string) $row->bucket;

            return [
                'key' => $key,
                'label' => $this->purposeLabel($key),
                'total_cash' => round((float) $row->total_cash, 2),
                'donations_count' => (int) $row->donations_count,
            ];
        })->values()->all();

        $inkindRows = InventoryItem::query()
            ->join('donations', 'inventory_items.donation_id', '=', 'donations.id')
            ->toBase()
            ->selectRaw("COALESCE(NULLIF(TRIM(donations.purpose), ''), '__uncategorized') as bucket")
            ->selectRaw('COUNT(DISTINCT donations.id) as donations_count')
            ->selectRaw('COUNT(inventory_items.id) as sku_lines')
            ->selectRaw('COALESCE(SUM(inventory_items.quantity), 0) as total_quantity')
            ->where('donations.type', DonationType::InKind->value)
            ->groupBy('bucket')
            ->orderByDesc(DB::raw('total_quantity'))
            ->get();

        $inKindByCampaignTag = $inkindRows->map(function ($row): array {
            $key = (string) $row->bucket;

            return [
                'key' => $key,
                'label' => $this->purposeLabel($key),
                'donations_count' => (int) $row->donations_count,
                'sku_lines' => (int) $row->sku_lines,
                'total_quantity_units' => (int) $row->total_quantity,
            ];
        })->values()->all();

        $cashGrandTotal = collect($cashByCampaignTag)->sum('total_cash');
        $inkindGrandUnits = collect($inKindByCampaignTag)->sum('total_quantity_units');

        $awarenessActivities = VolunteerOpportunity::query()
            ->where('activity_kind', VolunteerActivityKind::Awareness->value)
            ->withCount('linkedBeneficiaries')
            ->orderByDesc('starts_at')
            ->get()
            ->map(fn ($op): array => [
                'id' => $op->id,
                'title' => $op->title,
                'description' => $op->description,
                'starts_at' => $op->starts_at?->toISOString(),
                'ends_at' => $op->ends_at?->toISOString(),
                'status' => $op->status,
                'linked_beneficiaries_count' => (int) $op->linked_beneficiaries_count,
                'volunteer_slots_filled' => (int) $op->filled_slots,
                'volunteer_slots_required' => (int) $op->required_slots,
            ])
            ->all();

        return response()->json([
            '_kind' => 'campaign_reporting',
            'generated_at' => now()->toISOString(),
            'summary' => [
                'cash_grand_total' => round((float) $cashGrandTotal, 2),
                'in_kind_total_quantity_units' => (int) $inkindGrandUnits,
                'awareness_activities_count' => count($awarenessActivities),
                'methodology_notes_ar' => [
                    'يُجمَع تصنيف «الحملة» من حقل الغرض في سجلّ التبرع (نفسه لجميع أسطر الهبة العينية المرتبطة).',
                    'أنشطة «التوعية» هي فرص تطوع مُعرَّفة كتوعية؛ عدد المستفيدين المُدرَج هنا = المرتبطون يدوياً عبر المنصّة بالنشاط (وليس تعداد المسجّلين كمتطوعين).',
                    'الأهلية الفعلية للدعم تبقى وفق قواعد التصنيف والأهلية المخزّنة؛ يمكن لاحقاً دمج خوارزميات تراعي وزن كل فئة، والمخزون المتاح، ومواعيد الاستحقاق لاقتراح دفعات مسبقة يُصدِق عليها المسؤول البشري.',
                    'يمكن لاحقاً توسيع المنصّة بتصنيف ديناميكي يمزج درجة الأولوية، والحالات الطارئة، والالتزام ببرامج المتابعة الطبية أو الاجتماعية.',
                ],
            ],
            'cash_by_campaign_tag' => $cashByCampaignTag,
            'in_kind_by_campaign_tag' => $inKindByCampaignTag,
            'awareness_activities' => $awarenessActivities,
        ]);
    }

    private function purposeLabel(string $bucket): string
    {
        if ($bucket === '__uncategorized') {
            return 'بدون تصنيف حملة (الغرض فارغ)';
        }

        return $bucket;
    }
}
