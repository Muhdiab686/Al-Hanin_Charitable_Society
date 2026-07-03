<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use App\Notifications\SystemDatabaseNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_accountant_receives_and_can_read_notifications(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::Accountant->value]);
        $accountant->syncRoles([UserRole::Accountant->value]);

        $accountant->notify(new SystemDatabaseNotification(
            title: 'تنبيه تجريبي',
            message: 'هذا إشعار تجريبي للتحقق من API الإشعارات.',
            actionUrl: '/app/accountant/notifications',
        ));

        $list = $this->getJson('/api/v1/notifications', [
            'Authorization' => 'Bearer '.$accountant->createToken('accountant')->plainTextToken,
        ])->assertOk();

        $this->assertGreaterThanOrEqual(1, (int) $list->json('total'));

        $notificationId = (string) $list->json('data.0.id');
        $this->assertNotSame('', $notificationId);

        $mark = $this->patchJson('/api/v1/notifications/'.$notificationId.'/read', [], [
            'Authorization' => 'Bearer '.$accountant->createToken('accountant-2')->plainTextToken,
        ])->assertOk();
        $this->assertNotNull($mark->json('notification.read_at'));

        $this->postJson('/api/v1/notifications/read-all', [], [
            'Authorization' => 'Bearer '.$accountant->createToken('accountant-3')->plainTextToken,
        ])->assertOk();
    }
}
