<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

/**
 * حسابات ثابتة للتجربة (كلمة المرور الافتراضية: password).
 *
 * يُفترض تشغيل {@see RolesAndPermissionsSeeder} قبل هذا السيدر.
 */
class DemoAccountsSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'password';

    /**
     * @return list<array{name: string, email: string, role: UserRole}>
     */
    public static function demoAccounts(): array
    {
        return [
            [
                'name' => 'Admin User',
                'email' => 'admin@hanin.test',
                'role' => UserRole::Admin,
            ],
            [
                'name' => 'Secretary User',
                'email' => 'secretary@hanin.test',
                'role' => UserRole::Secretary,
            ],
            [
                'name' => 'Recording Secretary User',
                'email' => 'amin-alsirr@hanin.test',
                'role' => UserRole::RecordingSecretary,
            ],
            [
                'name' => 'Storekeeper User',
                'email' => 'storekeeper@hanin.test',
                'role' => UserRole::Storekeeper,
            ],
            [
                'name' => 'Doctor User',
                'email' => 'doctor@hanin.test',
                'role' => UserRole::Doctor,
            ],
            [
                'name' => 'Accountant User',
                'email' => 'accountant@hanin.test',
                'role' => UserRole::Accountant,
            ],
            [
                'name' => 'Volunteer User',
                'email' => 'volunteer@hanin.test',
                'role' => UserRole::Volunteer,
            ],
            [
                'name' => 'Beneficiary User',
                'email' => 'beneficiary@hanin.test',
                'role' => UserRole::Beneficiary,
            ],
            [
                'name' => 'Donor User',
                'email' => 'donor@hanin.test',
                'role' => UserRole::Donor,
            ],
        ];
    }

    public function run(): void
    {
        foreach (self::demoAccounts() as $data) {
            Role::findOrCreate($data['role']->value);

            $user = User::query()->firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => self::DEMO_PASSWORD,
                    'role' => $data['role']->value,
                ],
            );

            $user->forceFill([
                'name' => $data['name'],
                'role' => $data['role']->value,
                'password' => self::DEMO_PASSWORD,
            ])->save();

            $user->syncRoles([$data['role']->value]);

            if ($data['role'] === UserRole::Admin) {
                $user->forceFill(['role' => UserRole::Admin])->save();
                $user->syncRoles([UserRole::Admin->value]);
            }
        }
    }
}
