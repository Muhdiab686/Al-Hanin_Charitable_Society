<?php

namespace App\Http\Controllers\Api;

use App\Enums\DonationType;
use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use App\Models\DoctorPayoutRequest;
use App\Models\Donation;
use App\Models\Family;
use App\Models\FinancialTransaction;
use App\Models\InventoryItem;
use App\Models\MedicalRecord;
use App\Models\User;
use App\Models\VolunteerOpportunity;
use App\Models\VolunteerOpportunityRegistration;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleOverviewController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 403);

        abort_if($user->role === UserRole::Admin, 403, 'لمحة الأدوار غير مخصّصة لمدير النظام — استخدم لوحة الإدارة.');

        return match ($user->role) {
            UserRole::Secretary => response()->json($this->secretaryPayload()),
            UserRole::Accountant => response()->json($this->accountantPayload()),
            UserRole::Doctor => response()->json($this->doctorPayload($user)),
            UserRole::Storekeeper => response()->json($this->storekeeperPayload()),
            UserRole::Donor => response()->json($this->donorPayload($user)),
            UserRole::Volunteer => response()->json($this->volunteerPayload($user)),
            UserRole::Beneficiary => response()->json($this->beneficiaryPayload($user)),
            default => abort(403, 'Unsupported role for overview.'),
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function secretaryPayload(): array
    {
        $aidByStatus = AidRequest::query()
            ->toBase()
            ->select('status')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row): array => [(string) $row->status => (int) $row->aggregate])
            ->all();

        $homesPendingEnrollment = Family::query()
            ->whereIn('enrollment_status', [
                FamilyEnrollmentStatus::Draft->value,
                FamilyEnrollmentStatus::PendingBoard->value,
            ])
            ->count();

        $today = now()->startOfDay();

        return [
            '_kind' => 'role_overview',
            'role' => UserRole::Secretary->value,
            'title' => 'لوحة السكرتارية — لمحة يومية',
            'widgets' => [
                ['key' => 'beneficiaries', 'label' => 'المستفيدون المسجّلون', 'value' => Beneficiary::query()->count()],
                ['key' => 'families_enrollment_pending', 'label' => 'عائلات بانتظار اعتماد التسجيل', 'value' => $homesPendingEnrollment],
                ['key' => 'appointments_today', 'label' => 'مواعيد اليوم', 'value' => ClinicAppointment::query()
                    ->whereDate('scheduled_at', $today)
                    ->where('status', '!=', 'cancelled')
                    ->count()],
                ['key' => 'open_volunteer_roles', 'label' => 'فرص تطوّع لم تُكمَل مقاعدها', 'value' => VolunteerOpportunity::query()
                    ->where('status', 'open')
                    ->whereColumn('filled_slots', '<', 'required_slots')
                    ->count()],
                ['key' => 'aid_requests_total', 'label' => 'إجمالي طلبات المساعدة', 'value' => AidRequest::query()->count()],
                ['key' => 'aid_pending_review', 'label' => 'طلبات بانتظار المراجعة', 'value' => AidRequest::query()->where('status', 'pending')->count()],
            ],
            'charts' => [
                $this->barChart('طلبات المساعدة حسب الحالة', $aidByStatus, [
                    'pending' => 'قيد المراجعة',
                    'approved' => 'مقبولة',
                    'rejected' => 'مرفوضة',
                    'fulfilled' => 'تم التنفيذ',
                ]),
                $this->monthlyTotalsChart(
                    'طلبات مساعدة جديدة — آخر ستة أشهر',
                    AidRequest::class,
                    'created_at'
                ),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function accountantPayload(): array
    {
        $income = (float) FinancialTransaction::query()->where('type', 'income')->sum('amount');
        $expense = (float) FinancialTransaction::query()->where('type', 'expense')->sum('amount');
        $payoutPending = DoctorPayoutRequest::query()->where('status', 'pending')->count();

        $sixMonthIncome = [];

        foreach (range(5, 0) as $back) {
            $d = now()->copy()->startOfMonth()->subMonths($back);
            $sum = FinancialTransaction::query()
                ->where('type', 'income')
                ->whereYear('recorded_at', $d->year)
                ->whereMonth('recorded_at', $d->month)
                ->sum('amount');

            $sixMonthIncome[(string) $d->locale('ar')->isoFormat('MMM YYYY')] = (float) $sum;
        }

        return [
            '_kind' => 'role_overview',
            'role' => UserRole::Accountant->value,
            'title' => 'المحاسبة والمالية',
            'widgets' => [
                ['key' => 'income_total', 'label' => 'إجمالي الواردات المسجّلة', 'value' => number_format($income, 2, '.', '')],
                ['key' => 'expenses_total', 'label' => 'إجمالي المصروفات المسجّلة', 'value' => number_format($expense, 2, '.', '')],
                ['key' => 'net_estimate', 'label' => 'الصافي (وارد − صادر)', 'value' => number_format($income - $expense, 2, '.', '')],
                ['key' => 'donations_logged', 'label' => 'سجلات التبرعات', 'value' => Donation::query()->count()],
                ['key' => 'doctor_payouts_pending', 'label' => 'طلبات صرف أطباء بانتظار الموافقة', 'value' => $payoutPending],
            ],
            'charts' => [
                $this->numericBarChart('حركة الواردات الشهرية — آخر ستة أشهر', $sixMonthIncome),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function doctorPayload(User $user): array
    {
        $byStatus = ClinicAppointment::query()
            ->where('doctor_id', $user->id)
            ->toBase()
            ->select('status')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row): array => [(string) $row->status => (int) $row->aggregate])
            ->all();

        $recordsLogged = MedicalRecord::query()->where('doctor_id', $user->id)->count();

        return [
            '_kind' => 'role_overview',
            'role' => UserRole::Doctor->value,
            'title' => 'العيادة — ملخّصك الطبّي',
            'widgets' => [
                ['key' => 'my_appointments', 'label' => 'إجمالي مواعيدك', 'value' => ClinicAppointment::query()->where('doctor_id', $user->id)->count()],
                ['key' => 'upcoming_week', 'label' => 'مواعيد الأسبوع القادم', 'value' => ClinicAppointment::query()
                    ->where('doctor_id', $user->id)
                    ->where('status', '!=', 'cancelled')
                    ->whereBetween('scheduled_at', [now()->startOfDay(), now()->addDays(7)->endOfDay()])
                    ->count()],
                ['key' => 'medical_records_logged', 'label' => 'سجلات طبية تم إثباتها', 'value' => $recordsLogged],
                ['key' => 'completed_appointments', 'label' => 'استشارات مكتملة', 'value' => ClinicAppointment::query()
                    ->where('doctor_id', $user->id)
                    ->where('status', 'completed')
                    ->count()],
            ],
            'charts' => [
                $this->barChart('المواعيد حسب الحالة', $byStatus, [
                    'scheduled' => 'مجدولة',
                    'cancelled' => 'ملغاة',
                    'completed' => 'منجزة',
                ]),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function storekeeperPayload(): array
    {
        $byInvStatus = InventoryItem::query()
            ->toBase()
            ->select('status')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row): array => [(string) $row->status => (int) $row->aggregate])
            ->all();

        $expiringSoon = InventoryItem::query()
            ->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->whereDate('expiry_date', '<=', now()->addDays(45)->toDateString())
            ->count();

        $aidByStatus = AidRequest::query()
            ->toBase()
            ->select('status')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row): array => [(string) $row->status => (int) $row->aggregate])
            ->all();

        return [
            '_kind' => 'role_overview',
            'role' => UserRole::Storekeeper->value,
            'title' => 'المستودع والتوزيع',
            'widgets' => [
                ['key' => 'inventory_lines', 'label' => 'بنود المخزون', 'value' => InventoryItem::query()->count()],
                ['key' => 'expiry_within_45d', 'label' => 'مواد ضمن صلاحية ٤٥ يومًا', 'value' => $expiringSoon],
                ['key' => 'in_kind_donations_30d', 'label' => 'تبرعات عينية خلال ٣٠ يومًا', 'value' => Donation::query()
                    ->where('type', DonationType::InKind->value)
                    ->where('created_at', '>=', now()->subDays(30))
                    ->count()],
                ['key' => 'stored_quantity', 'label' => 'كمية متبقّية مجمّعة', 'value' => (int) InventoryItem::query()->sum('quantity_remaining')],
            ],
            'charts' => [
                $this->barChart('المخزون حسب الحالة', $byInvStatus, [
                    'stored' => 'مُخزّن',
                    'distributed' => 'موزَّع',
                    'disposed' => 'مصروف/مستبعد',
                ]),
                $this->barChart('متابعة الطلبات (لوجستيك)', $aidByStatus, [
                    'pending' => 'قيد المراجعة',
                    'approved' => 'مقبولة',
                    'rejected' => 'مرفوضة',
                    'fulfilled' => 'تم التنفيذ',
                ]),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function donorPayload(User $user): array
    {
        $query = Donation::query()->where('registered_by', $user->id);

        $totalCash = (float) (clone $query)->where('type', DonationType::Cash->value)->sum('cash_amount');

        $byTypeDefaults = collect(DonationType::cases())
            ->mapWithKeys(fn (DonationType $t): array => [$t->value => 0])
            ->all();

        $byTypeCounts = collect($byTypeDefaults)->merge(
            (clone $query)->toBase()
                ->select('type')
                ->selectRaw('COUNT(*) as aggregate')
                ->groupBy('type')
                ->get()
                ->mapWithKeys(fn ($row): array => [(string) $row->type => (int) $row->aggregate])
        )->all();

        $recurringCommitted = (clone $query)->whereIn('pledge_frequency', ['monthly', 'quarterly', 'yearly'])->count();

        return [
            '_kind' => 'role_overview',
            'role' => UserRole::Donor->value,
            'title' => 'تبرعاتك وتأثيرها',
            'widgets' => [
                ['key' => 'contributions_logged', 'label' => 'تبرعات مسجّلة بحسابك', 'value' => (clone $query)->count()],
                ['key' => 'cash_totals_you', 'label' => 'إجمالي التبرعات النقدية (بحسابك)', 'value' => number_format($totalCash, 2, '.', '')],
                ['key' => 'recurring_pledges', 'label' => 'تعهدات دورية مسجّلة', 'value' => $recurringCommitted],
            ],
            'charts' => [
                $this->barChart('توزيع تبرعاتك (نوعًا)', $byTypeCounts, [
                    'cash' => 'نقدية',
                    'in_kind' => 'عينية',
                ]),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function volunteerPayload(User $user): array
    {
        $registrations = VolunteerOpportunityRegistration::query()->where('user_id', $user->id)->count();

        $openSlots = VolunteerOpportunity::query()
            ->where('status', 'open')
            ->get()
            ->sum(fn (VolunteerOpportunity $op): int => max(0, $op->required_slots - $op->filled_slots));

        $aidMine = AidRequest::query()->where('created_by', $user->id)->count();

        $aidMineByStatus = AidRequest::query()
            ->where('created_by', $user->id)
            ->toBase()
            ->select('status')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row): array => [(string) $row->status => (int) $row->aggregate])
            ->all();

        return [
            '_kind' => 'role_overview',
            'role' => UserRole::Volunteer->value,
            'title' => 'نشاط التطوّع والمساهمة الميدانية',
            'widgets' => [
                ['key' => 'activities_joined', 'label' => 'نشاطات سجّلت فيها', 'value' => $registrations],
                ['key' => 'open_roles_total', 'label' => 'مقاعد شاغرة عبر كل الفرص', 'value' => (int) $openSlots],
                ['key' => 'aid_requests_you_submitted', 'label' => 'طلبات مساعدة قدّمتها أنت', 'value' => $aidMine],
            ],
            'charts' => [
                $this->barChart('طلبات مساعدتك حسب المرحلة', $aidMineByStatus, [
                    'pending' => 'قيد المراجعة',
                    'approved' => 'مقبولة',
                    'rejected' => 'مرفوضة',
                    'fulfilled' => 'تم التنفيذ',
                ]),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function beneficiaryPayload(User $user): array
    {
        $beneficiary = Beneficiary::query()->where('user_id', $user->id)->first();

        if ($beneficiary === null) {
            return [
                '_kind' => 'role_overview',
                'role' => UserRole::Beneficiary->value,
                'title' => 'لمحة المستفيد',
                'notice' => 'لم يتم ربط هذا الحساب بعد بملف مستفيد في الجمعية. تواصل مع المكتب لإكمال الربط.',
                'widgets' => [],
                'charts' => [],
            ];
        }

        $aidByStatus = AidRequest::query()
            ->where('beneficiary_id', $beneficiary->id)
            ->toBase()
            ->select('status')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row): array => [(string) $row->status => (int) $row->aggregate])
            ->all();

        $appointmentsUpcoming = ClinicAppointment::query()
            ->where('beneficiary_id', $beneficiary->id)
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>=', now())
            ->count();

        $recordsCount = MedicalRecord::query()->where('beneficiary_id', $beneficiary->id)->count();

        return [
            '_kind' => 'role_overview',
            'role' => UserRole::Beneficiary->value,
            'title' => 'لمحة سريعة — '.$beneficiary->name,
            'widgets' => [
                ['key' => 'aid_requests_you', 'label' => 'طلبات المساعدة الخاصة بك', 'value' => AidRequest::query()->where('beneficiary_id', $beneficiary->id)->count()],
                ['key' => 'aid_pending_review', 'label' => 'طلبات بانتظار الاعتماد', 'value' => AidRequest::query()->where('beneficiary_id', $beneficiary->id)->where('status', 'pending')->count()],
                ['key' => 'scheduled_appointments', 'label' => 'مواعيد مستقبلية مجدولة', 'value' => $appointmentsUpcoming],
                ['key' => 'medical_followups', 'label' => 'سجلات طبية مسجّلة', 'value' => $recordsCount],
                ['key' => 'wallet', 'label' => 'رصيد المحفظة الطبيّة', 'value' => (string) $beneficiary->medical_wallet_balance],
            ],
            'charts' => [
                $this->barChart('مساعداتك حسب الحالة', $aidByStatus, [
                    'pending' => 'قيد المراجعة',
                    'approved' => 'مقبولة',
                    'rejected' => 'مرفوضة',
                    'fulfilled' => 'تم التنفيذ',
                ]),
            ],
        ];
    }

    /**
     * @param  array<string, int|string|float>  $raw
     * @param  array<string, string>  $labels
     * @return array<string, mixed>
     */
    private function barChart(string $title, array $raw, array $labels): array
    {
        $items = [];

        foreach ($raw as $code => $value) {
            $items[] = [
                'label' => $labels[(string) $code] ?? (string) $code,
                'value' => max(0, (int) $value),
            ];
        }

        if ($items === []) {
            $items[] = ['label' => 'لا توجد بيانات بعد', 'value' => 0];
        }

        return ['id' => 'bar_'.md5($title), 'title' => $title, 'kind' => 'bar', 'items' => array_values($items)];
    }

    /** @param  array<string, float|int|numeric-string>  $map */
    private function numericBarChart(string $title, array $map): array
    {
        $items = [];
        foreach ($map as $label => $value) {
            $items[] = ['label' => $label, 'value' => is_numeric($value) ? round((float) $value, 2) : 0];
        }

        return ['id' => 'bar_nums_'.md5($title), 'title' => $title, 'kind' => 'bar', 'items' => $items];
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  non-empty-string  $dateColumn
     * @return array<string, mixed>
     */
    private function monthlyTotalsChart(string $title, string $modelClass, string $dateColumn): array
    {
        $map = [];

        foreach (range(5, 0) as $back) {
            $d = now()->copy()->startOfMonth()->subMonths($back);
            $count = $modelClass::query()
                ->whereYear($dateColumn, $d->year)
                ->whereMonth($dateColumn, $d->month)
                ->count();
            $map[(string) $d->locale('ar')->isoFormat('MMM YYYY')] = $count;
        }

        return $this->numericBarChart($title, $map);
    }
}
