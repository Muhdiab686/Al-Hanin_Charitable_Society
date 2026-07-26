<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use App\Models\Family;
use App\Models\User;
use App\Notifications\SystemDatabaseNotification;
use App\Services\AppNotificationService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BeneficiaryAppointmentScopeApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_notify_roles_does_not_notify_beneficiary_users(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        // حتى لو بقيت أدوار Spatie خاطئة، يجب ألا يُرسل الإشعار بالاعتماد على العمود فقط
        $beneficiaryUser->assignRole(UserRole::Secretary->value);

        app(AppNotificationService::class)->notifyRoles(
            ['secretary', 'recording_secretary', 'admin'],
            'طلب موعد طبي جديد',
            'تم إرسال طلب موعد طبي جديد ويحتاج المراجعة.',
            '/app/secretary/clinic',
        );

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $secretary->id,
            'notifiable_type' => User::class,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'notifiable_id' => $beneficiaryUser->id,
            'notifiable_type' => User::class,
        ]);
    }

    public function test_beneficiary_notifications_hide_staff_clinic_alerts(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);

        $beneficiaryUser->notify(new SystemDatabaseNotification(
            'طلب موعد طبي جديد',
            'تم إرسال طلب موعد طبي جديد ويحتاج المراجعة.',
            '/app/secretary/clinic',
        ));
        $beneficiaryUser->notify(new SystemDatabaseNotification(
            'اقتراح تعديل موعد طبي',
            'تم إرسال وقت بديل لموعدك الطبي.',
            '/app/beneficiary/appointments',
        ));

        $list = $this->getJson('/api/v1/notifications', [
            'Authorization' => 'Bearer '.$beneficiaryUser->createToken('b')->plainTextToken,
        ])->assertOk();

        $this->assertSame(1, (int) $list->json('total'));
        $this->assertSame('اقتراح تعديل موعد طبي', $list->json('data.0.data.title'));
    }

    public function test_beneficiary_sees_only_own_appointments(): void
    {
        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);

        $family = Family::factory()->create(['enrollment_status' => FamilyEnrollmentStatus::Approved]);
        $own = Beneficiary::factory()->create([
            'family_id' => $family->id,
            'user_id' => $beneficiaryUser->id,
        ]);
        $other = Beneficiary::factory()->create([
            'family_id' => $family->id,
        ]);

        $doctor = User::factory()->create(['role' => UserRole::Doctor]);

        ClinicAppointment::query()->create([
            'beneficiary_id' => $own->id,
            'doctor_id' => $doctor->id,
            'created_by' => $beneficiaryUser->id,
            'scheduled_at' => now()->addDay(),
            'status' => 'scheduled',
            'workflow_status' => 'scheduled',
            'requested_specialty' => 'طب عام',
        ]);
        ClinicAppointment::query()->create([
            'beneficiary_id' => $other->id,
            'doctor_id' => $doctor->id,
            'created_by' => $doctor->id,
            'scheduled_at' => now()->addDays(2),
            'status' => 'scheduled',
            'workflow_status' => 'scheduled',
            'requested_specialty' => 'قلب',
        ]);

        $response = $this->getJson('/api/v1/appointments', [
            'Authorization' => 'Bearer '.$beneficiaryUser->createToken('b')->plainTextToken,
        ])->assertOk();

        $this->assertSame(1, (int) $response->json('total'));
        $this->assertSame($own->id, (int) $response->json('data.0.beneficiary_id'));
    }
}
