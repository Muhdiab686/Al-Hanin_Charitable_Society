<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AidRequest;
use App\Models\Beneficiary;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BeneficiaryLifecycleApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_beneficiary_registration_links_beneficiary_id(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Family Head',
            'email' => 'head@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => UserRole::Beneficiary->value,
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['beneficiary_id', 'user' => ['beneficiary_id']]);

        $this->assertDatabaseHas('beneficiaries', [
            'user_id' => $response->json('user.id'),
        ]);
    }

    public function test_beneficiary_login_returns_beneficiary_id(): void
    {
        $user = User::factory()->create([
            'email' => 'login-ben@example.com',
            'password' => 'password123',
            'role' => UserRole::Beneficiary,
        ]);
        $user->syncRoles([UserRole::Beneficiary->value]);

        Beneficiary::factory()->create([
            'user_id' => $user->id,
            'national_id' => 'NAT-LOGIN-001',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('beneficiary_id', $user->beneficiaryProfile->id);
    }

    public function test_admin_can_onboard_beneficiary_with_generated_credentials(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $admin->syncRoles([UserRole::Admin->value]);
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/beneficiaries/onboard', [
            'family' => [
                'head_name' => 'عائلة أحمد',
                'phone' => '0599000000',
                'members_count' => 5,
            ],
            'head' => [
                'name' => 'أحمد محمد',
                'national_id' => 'ONB-001',
            ],
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated()
            ->assertJsonStructure([
                'credentials' => ['email', 'password'],
                'beneficiary' => ['id', 'family_id'],
            ]);
    }

    public function test_beneficiary_dashboard_requires_linked_profile(): void
    {
        $user = User::factory()->create(['role' => UserRole::Beneficiary]);
        $user->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $user->id]);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->getJson('/api/v1/beneficiary/dashboard', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()
            ->assertJsonPath('beneficiary_id', $beneficiary->id);
    }

    public function test_beneficiary_dashboard_includes_requested_materials_with_aid_type_alias(): void
    {
        $user = User::factory()->create(['role' => UserRole::Beneficiary]);
        $user->syncRoles([UserRole::Beneficiary->value]);
        $beneficiary = Beneficiary::factory()->create(['user_id' => $user->id]);
        AidRequest::query()->create([
            'beneficiary_id' => $beneficiary->id,
            'created_by' => $user->id,
            'type' => 'surgery',
            'description' => 'Need surgery support',
            'status' => 'pending',
        ]);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->getJson('/api/v1/beneficiary/dashboard', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk()
            ->assertJsonPath('requested_materials.0.aid_type', 'surgery')
            ->assertJsonPath('requested_materials.0.status', 'pending');
    }

    public function test_secretary_can_list_beneficiaries_for_clinic_and_medical_workflow(): void
    {
        $secretary = User::factory()->create(['role' => UserRole::Secretary]);
        $secretary->syncRoles([UserRole::Secretary->value]);
        $token = $secretary->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/beneficiaries', [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();
    }

    public function test_admin_can_create_family_with_members_in_single_request(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $admin->syncRoles([UserRole::Admin->value]);
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/beneficiaries', [
            'family' => [
                'head_name' => 'عائلة الاختبار',
                'phone' => '0599000001',
                'address' => 'غزة - الرمال',
                'members_count' => 3,
                'housing_status' => 'rented',
                'monthly_income' => 500,
                'enrollment_status' => 'pending_board',
            ],
            'beneficiary' => [
                'national_id' => 'HEAD-001',
                'name' => 'رب الأسرة',
                'family_relationship' => 'head',
                'is_head_of_family' => true,
                'phone' => '0599000001',
            ],
            'members' => [
                [
                    'national_id' => 'SP-001',
                    'name' => 'الزوجة',
                    'family_relationship' => 'spouse',
                    'gender' => 'female',
                ],
                [
                    'national_id' => 'CH-001',
                    'name' => 'الابن',
                    'family_relationship' => 'child',
                    'gender' => 'male',
                ],
            ],
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated()
            ->assertJsonPath('credentials.email', fn ($email): bool => is_string($email) && str_contains($email, '@'))
            ->assertJsonPath('credentials.password', fn ($password): bool => is_string($password) && strlen($password) >= 8);

        $familyId = (int) $response->json('beneficiary.family_id');
        $headBeneficiaryId = (int) $response->json('beneficiary.id');
        $this->assertDatabaseHas('families', [
            'id' => $familyId,
            'members_count' => 3,
            'system_generated_credentials' => true,
        ]);
        $this->assertDatabaseHas('beneficiaries', [
            'family_id' => $familyId,
            'national_id' => 'SP-001',
        ]);
        $this->assertDatabaseHas('beneficiaries', [
            'family_id' => $familyId,
            'national_id' => 'CH-001',
        ]);
        $this->assertNotNull(Beneficiary::query()->findOrFail($headBeneficiaryId)->user_id);
    }
}
