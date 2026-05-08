<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Category;
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
            'families.enrollment.review',
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
            'volunteers.view',
            'volunteers.register',
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
                'volunteers.view',
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
                'donations.create',
                'donations.view',
                'aid.distribute',
            ],
            UserRole::Volunteer->value => [
                'aid.distribute',
                'aid.request.create',
                'volunteers.view',
                'volunteers.register',
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

        Role::findOrCreate(UserRole::Admin->value)->syncPermissions(Permission::query()->pluck('name')->all());

        $financial = Category::query()->firstOrCreate(
            ['name' => 'financial'],
            ['priority' => 1, 'description' => 'Low-income families']
        );
        $health = Category::query()->firstOrCreate(
            ['name' => 'health'],
            ['priority' => 2, 'description' => 'Families with medical cases']
        );
        $family = Category::query()->firstOrCreate(
            ['name' => 'family'],
            ['priority' => 3, 'description' => 'Large family households']
        );

        $financial->rules()->updateOrCreate([], [
            'max_monthly_income' => 150,
            'min_family_members' => null,
            'requires_medical_case' => false,
            'is_active' => true,
        ]);
        $health->rules()->updateOrCreate([], [
            'max_monthly_income' => null,
            'min_family_members' => null,
            'requires_medical_case' => true,
            'is_active' => true,
        ]);
        $family->rules()->updateOrCreate([], [
            'max_monthly_income' => 350,
            'min_family_members' => 5,
            'requires_medical_case' => false,
            'is_active' => true,
        ]);
    }
}
