<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'beneficiaries.manage',
            'beneficiaries.view',
            'aid.distribute',
            'aid.request.create',
            'aid.request.review',
            'inventory.manage',
            'inventory.view',
            'donations.create',
            'donations.view',
            'medical.records.view',
            'medical.records.manage',
            'appointments.manage',
            'appointments.view',
            'finance.reports.view',
            'finance.expenses.manage',
            'users.manage',
            'roles.manage',
            'volunteers.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission);
        }

        $rolePermissions = [
            UserRole::Admin->value => $permissions,
            UserRole::Secretary->value => [
                'beneficiaries.manage',
                'beneficiaries.view',
                'aid.request.review',
                'appointments.manage',
                'appointments.view',
                'medical.records.view',
                'volunteers.manage',
            ],
            UserRole::Accountant->value => [
                'donations.create',
                'donations.view',
                'finance.reports.view',
                'finance.expenses.manage',
            ],
            UserRole::Doctor->value => [
                'appointments.view',
                'medical.records.view',
                'medical.records.manage',
            ],
            UserRole::Storekeeper->value => [
                'inventory.manage',
                'inventory.view',
                'aid.distribute',
            ],
            UserRole::Volunteer->value => [
                'aid.distribute',
                'aid.request.create',
            ],
            UserRole::Beneficiary->value => [
                'aid.request.create',
                'appointments.view',
                'medical.records.view',
            ],
            UserRole::Donor->value => [
                'donations.create',
                'donations.view',
            ],
        ];

        foreach ($rolePermissions as $roleName => $assignedPermissions) {
            $role = Role::findOrCreate($roleName);
            $role->syncPermissions($assignedPermissions);
        }
    }
}
