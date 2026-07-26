<?php

namespace Tests\Feature;

use App\Enums\FamilyEnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\ClinicAppointment;
use App\Models\ClinicStaffProfile;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentNotificationDeepLinkApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_beneficiary_appointment_request_notifies_secretary_with_appointment_id_link(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $doctor->syncRoles([UserRole::Doctor->value]);
        ClinicStaffProfile::query()->create([
            'user_id' => $doctor->id,
            'role' => 'doctor',
            'specialty' => 'طب عام',
            'monthly_salary' => 0,
            'consultation_fee' => 0,
            'is_active' => true,
        ]);

        $beneficiaryUser = User::factory()->create(['role' => UserRole::Beneficiary->value]);
        $beneficiaryUser->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $beneficiaryUser->id]);
        $beneficiary->family->forceFill(['enrollment_status' => FamilyEnrollmentStatus::Approved])->save();

        $response = $this->postJson('/api/v1/appointments/request', [
            'doctor_id' => $doctor->id,
            'requested_specialty' => 'طب عام',
            'reason' => 'متابعة',
            'preferred_date' => now()->addDay()->toDateString(),
            'preferred_time' => '10:00',
        ], [
            'Authorization' => 'Bearer '.$beneficiaryUser->createToken('b')->plainTextToken,
        ]);

        $response->assertCreated();
        $appointmentId = (int) $response->json('appointment.id');
        $this->assertGreaterThan(0, $appointmentId);

        $notification = $secretary->notifications()->latest()->first();
        $this->assertNotNull($notification);
        $this->assertSame('طلب موعد طبي جديد', $notification->data['title'] ?? null);
        $this->assertSame($appointmentId, (int) ($notification->data['meta']['appointment_id'] ?? 0));
        $this->assertStringContainsString(
            'appointment_id='.$appointmentId,
            (string) ($notification->data['action_url'] ?? '')
        );
    }

    public function test_secretary_can_fetch_single_appointment_details(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary->value]);
        $secretary->syncRoles([UserRole::Secretary->value]);

        $doctor = User::factory()->create(['role' => UserRole::Doctor->value]);
        $beneficiary = Beneficiary::factory()->create();
        $appointment = ClinicAppointment::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'doctor_id' => $doctor->id,
            'created_by' => $secretary->id,
            'scheduled_at' => now()->addDay(),
            'status' => 'pending',
            'workflow_status' => 'pending_approval',
            'reason' => 'فحص',
        ]);

        $response = $this->getJson('/api/v1/appointments/'.$appointment->id, [
            'Authorization' => 'Bearer '.$secretary->createToken('s')->plainTextToken,
        ]);

        $response->assertOk()
            ->assertJsonPath('appointment.id', $appointment->id)
            ->assertJsonPath('appointment.beneficiary_id', $beneficiary->id)
            ->assertJsonPath('appointment.reason', 'فحص');
    }

    public function test_campaigns_index_supports_per_page_for_plan_dropdown(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);

        for ($i = 1; $i <= 3; $i++) {
            $this->postJson('/api/v1/campaigns', [
                'title' => "حملة اختبار {$i}",
                'goal_amount' => 1000 * $i,
                'status' => 'active',
            ], [
                'Authorization' => 'Bearer '.$admin->createToken('a'.$i)->plainTextToken,
            ])->assertCreated();
        }

        $recordingSecretary = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $recordingSecretary->syncRoles([UserRole::RecordingSecretary->value]);

        $response = $this->getJson('/api/v1/campaigns?per_page=100', [
            'Authorization' => 'Bearer '.$recordingSecretary->createToken('rs')->plainTextToken,
        ]);

        $response->assertOk();
        $this->assertGreaterThanOrEqual(3, count($response->json('data') ?? []));
        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertContains('حملة اختبار 1', $titles);
        $this->assertContains('حملة اختبار 3', $titles);
    }
}
