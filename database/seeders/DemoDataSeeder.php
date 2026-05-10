<?php

namespace Database\Seeders;

use App\Enums\DonationType;
use App\Enums\FamilyEnrollmentStatus;
use App\Enums\InventoryItemStatus;
use App\Enums\InventoryRemovalReason;
use App\Enums\InventorySpoilageCategory;
use App\Enums\UserRole;
use App\Enums\VolunteerActivityKind;
use App\Models\AidInventoryAllocation;
use App\Models\AidRequest;
use App\Models\ApprovalRequest;
use App\Models\Beneficiary;
use App\Models\Donation;
use App\Models\Family;
use App\Models\FinancialTransaction;
use App\Models\InventoryItem;
use App\Models\InventoryRemoval;
use App\Models\User;
use App\Models\VolunteerOpportunity;
use App\Models\VolunteerOpportunityRegistration;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * بيانات تجريبية (عائلات، مستفيدون، تبرعات، طلبات مساعدة، فرص تطوع…).
 *
 * يعتمد على وجود المستخدمين الّذي ينشئهم {@see DemoAccountsSeeder}.
 * آمن للتكرار: إن وُجدت تبرعات البذرة يتوقف دون تكرار الإدراج.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (Donation::query()->where('receipt_code', 'DON-SEED-01')->exists()) {
            return;
        }

        $accountant = User::query()->where('email', 'accountant@hanin.test')->firstOrFail();
        $storekeeper = User::query()->where('email', 'storekeeper@hanin.test')->firstOrFail();
        $secretary = User::query()->where('email', 'secretary@hanin.test')->firstOrFail();
        $volunteer = User::query()->where('email', 'volunteer@hanin.test')->firstOrFail();

        $beneficiaries = collect();
        $enrollmentStates = [
            FamilyEnrollmentStatus::Approved,
            FamilyEnrollmentStatus::Approved,
            FamilyEnrollmentStatus::Approved,
            FamilyEnrollmentStatus::Approved,
            FamilyEnrollmentStatus::PendingBoard,
            FamilyEnrollmentStatus::Draft,
            FamilyEnrollmentStatus::Rejected,
            FamilyEnrollmentStatus::Approved,
            FamilyEnrollmentStatus::Approved,
            FamilyEnrollmentStatus::Approved,
            FamilyEnrollmentStatus::Approved,
            FamilyEnrollmentStatus::Approved,
        ];

        foreach ($enrollmentStates as $index => $state) {
            $family = Family::query()->create([
                'family_code' => 'FAM-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                'head_name' => 'Family Head '.($index + 1),
                'phone' => '0999'.str_pad((string) (100000 + $index), 6, '0', STR_PAD_LEFT),
                'address' => 'District '.(($index % 4) + 1),
                'members_count' => 3 + ($index % 5),
                'monthly_income' => 80 + ($index * 35),
                'has_direct_income' => $index === 10,
                'aid_paused_at' => $index === 10 ? now()->subDays(20) : null,
                'aid_pause_reason' => $index === 10 ? 'Direct salary detected' : null,
                'enrollment_status' => $state,
            ]);

            $beneficiary = Beneficiary::query()->create([
                'family_id' => $family->id,
                'national_id' => 'NID'.str_pad((string) (100000 + $index), 8, '0', STR_PAD_LEFT),
                'name' => 'Beneficiary '.($index + 1),
                'date_of_birth' => Carbon::now()->subYears(22 + ($index % 20))->toDateString(),
                'phone' => '0988'.str_pad((string) (200000 + $index), 6, '0', STR_PAD_LEFT),
                'status' => 'active',
                'medical_wallet_balance' => $index % 3 === 0 ? 25.00 : 0.00,
                'is_head_of_family' => true,
                'notes' => 'Seeded demo beneficiary',
            ]);

            $beneficiaries->push($beneficiary);
        }

        for ($month = 1; $month <= 12; $month++) {
            $cashAmount = 500 + ($month * 45);
            $date = Carbon::create(now()->year, $month, 10, 12, 0, 0);

            $campaignPurpose = match ($month % 4) {
                0 => 'حملة إغاثة موسم الشتاء',
                1 => 'دعم تعليمي وتأهيل مهني',
                2 => 'تغذية ومياه نقية',
                default => 'تبرعات عامة — غير مصنّفة',
            };

            $cashDonation = Donation::query()->create([
                'type' => DonationType::Cash,
                'channel' => $month % 2 === 0 ? 'web' : 'manual',
                'cash_amount' => $cashAmount,
                'donor_name' => 'Cash Donor '.$month,
                'donor_phone' => '0933'.str_pad((string) (300000 + $month), 6, '0', STR_PAD_LEFT),
                'notes' => 'Monthly donation',
                'purpose' => $campaignPurpose,
                'receipt_code' => 'DON-SEED-'.str_pad((string) $month, 2, '0', STR_PAD_LEFT),
                'registered_by' => $accountant->id,
                'created_at' => $date,
                'updated_at' => $date,
            ]);

            FinancialTransaction::query()->create([
                'type' => 'income',
                'source' => 'donation_cash',
                'amount' => $cashAmount,
                'reference_type' => Donation::class,
                'reference_id' => $cashDonation->id,
                'description' => 'Seeded cash donation '.$cashDonation->receipt_code,
                'recorded_by' => $accountant->id,
                'recorded_at' => $date,
                'created_at' => $date,
                'updated_at' => $date,
            ]);

            $inKindDonation = Donation::query()->create([
                'type' => DonationType::InKind,
                'channel' => 'manual',
                'cash_amount' => null,
                'donor_name' => 'InKind Donor '.$month,
                'donor_phone' => '0944'.str_pad((string) (400000 + $month), 6, '0', STR_PAD_LEFT),
                'notes' => 'Monthly in-kind donation',
                'purpose' => $campaignPurpose,
                'receipt_code' => 'DON-INK-'.str_pad((string) $month, 2, '0', STR_PAD_LEFT),
                'registered_by' => $storekeeper->id,
                'created_at' => $date,
                'updated_at' => $date,
            ]);

            $item = InventoryItem::query()->create([
                'donation_id' => $inKindDonation->id,
                'item_code' => 'INV-SEED-'.str_pad((string) $month, 2, '0', STR_PAD_LEFT),
                'name' => $month % 3 === 0 ? 'Medicine Kit' : 'Food Package',
                'spoilage_category' => $month % 3 === 0 ? InventorySpoilageCategory::Perishable : InventorySpoilageCategory::NonPerishable,
                'quantity' => 40 + $month,
                'quantity_remaining' => 18 + $month,
                'expiry_date' => $month % 3 === 0 ? Carbon::create(now()->year, min($month + 2, 12), 28)->toDateString() : null,
                'condition_notes' => null,
                'storage_location' => 'WH-'.(($month % 4) + 1),
                'status' => InventoryItemStatus::Stored,
                'created_at' => $date,
                'updated_at' => $date,
            ]);

            $approvedBeneficiary = $beneficiaries
                ->filter(fn (Beneficiary $b) => $b->family->enrollment_status === FamilyEnrollmentStatus::Approved)
                ->values()
                ->get($month % 6);

            $aidType = match ($month % 3) {
                0 => 'medical_prescription',
                1 => 'urgent_financial',
                default => 'special_item',
            };

            $aidRequest = AidRequest::query()->create([
                'beneficiary_id' => $approvedBeneficiary->id,
                'created_by' => $secretary->id,
                'type' => $aidType,
                'requested_amount' => $aidType === 'urgent_financial' ? 150 + $month : null,
                'description' => 'Seeded aid request for month '.$month,
                'status' => 'approved',
                'submitted_at' => $date->copy()->subDays(3),
                'created_at' => $date->copy()->subDays(3),
                'updated_at' => $date->copy()->subDays(2),
            ]);

            ApprovalRequest::query()->create([
                'aid_request_id' => $aidRequest->id,
                'reviewed_by' => $secretary->id,
                'decision' => 'approved',
                'review_note' => 'Seed approval',
                'reviewed_at' => $date->copy()->subDays(2),
                'created_at' => $date->copy()->subDays(2),
                'updated_at' => $date->copy()->subDays(2),
            ]);

            $distributedQty = 12 + ($month % 8);
            AidInventoryAllocation::query()->create([
                'aid_request_id' => $aidRequest->id,
                'inventory_item_id' => $item->id,
                'quantity' => $distributedQty,
                'distributed_by' => $storekeeper->id,
                'delivered_by' => $volunteer->id,
                'delivered_at' => $date->copy()->addDays(1),
                'notes' => 'Seed distribution',
                'delivery_note' => 'Seed delivery',
                'created_at' => $date->copy()->addDay(),
                'updated_at' => $date->copy()->addDay(),
            ]);

            InventoryRemoval::query()->create([
                'inventory_item_id' => $item->id,
                'quantity' => 2 + ($month % 3),
                'reason' => $month % 2 === 0 ? InventoryRemovalReason::Expired : InventoryRemovalReason::Damaged,
                'notes' => 'Seed stock cleanup',
                'removed_by' => $storekeeper->id,
                'removed_at' => $date->copy()->addDays(2),
                'created_at' => $date->copy()->addDays(2),
                'updated_at' => $date->copy()->addDays(2),
            ]);

            if ($month % 4 === 0) {
                FinancialTransaction::query()->create([
                    'type' => 'expense',
                    'source' => 'doctor_payout',
                    'amount' => 220 + $month,
                    'reference_type' => AidRequest::class,
                    'reference_id' => $aidRequest->id,
                    'description' => 'Seeded clinic payout expense',
                    'recorded_by' => $accountant->id,
                    'recorded_at' => $date->copy()->addDays(3),
                    'created_at' => $date->copy()->addDays(3),
                    'updated_at' => $date->copy()->addDays(3),
                ]);
            }
        }

        $opportunity = VolunteerOpportunity::query()->create([
            'title' => 'Ramadan Aid Distribution',
            'description' => 'Support distribution operations during Ramadan.',
            'required_slots' => 8,
            'filled_slots' => 0,
            'starts_at' => now()->subDays(20),
            'ends_at' => now()->addDays(20),
            'status' => 'open',
            'activity_kind' => VolunteerActivityKind::General,
            'created_by' => $secretary->id,
        ]);

        $volunteerUsers = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', UserRole::Volunteer->value))
            ->get();

        foreach ($volunteerUsers as $idx => $user) {
            VolunteerOpportunityRegistration::query()->create([
                'volunteer_opportunity_id' => $opportunity->id,
                'user_id' => $user->id,
                'registered_at' => now()->subDays(10 - $idx),
                'created_at' => now()->subDays(10 - $idx),
                'updated_at' => now()->subDays(10 - $idx),
            ]);
        }

        $opportunity->forceFill([
            'filled_slots' => $volunteerUsers->count(),
            'status' => $volunteerUsers->count() >= $opportunity->required_slots ? 'closed' : 'open',
        ])->save();

        $awareness = VolunteerOpportunity::query()->create([
            'title' => 'جلسات توعية صحية — المجتمع المحلي',
            'description' => 'جولات بيوت وتوعية بشأن سوء التغذية ومتابعة الوصفات.',
            'required_slots' => 12,
            'filled_slots' => 0,
            'starts_at' => now()->subDays(5),
            'ends_at' => now()->addDays(45),
            'status' => 'open',
            'activity_kind' => VolunteerActivityKind::Awareness,
            'created_by' => $secretary->id,
        ]);

        $linked = $beneficiaries
            ->filter(fn (Beneficiary $b) => $b->family->enrollment_status === FamilyEnrollmentStatus::Approved)
            ->take(5);

        $awareness->linkedBeneficiaries()->sync($linked->pluck('id')->all());
    }
}
