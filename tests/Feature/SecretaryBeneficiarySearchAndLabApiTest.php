<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Beneficiary;
use App\Models\Category;
use App\Models\Family;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecretaryBeneficiarySearchAndLabApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function secretaryHeaders(User $user): array
    {
        $user->syncRoles([UserRole::Secretary->value]);

        return ['Authorization' => 'Bearer '.$user->createToken('s')->plainTextToken];
    }

    private function recordingSecretaryHeaders(User $user): array
    {
        $user->syncRoles([UserRole::RecordingSecretary->value]);

        return ['Authorization' => 'Bearer '.$user->createToken('rs')->plainTextToken];
    }

    public function test_recording_secretary_sees_beneficiaries_created_via_admin_program_endpoint(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $admin->syncRoles([UserRole::Admin->value]);
        $adminHeaders = ['Authorization' => 'Bearer '.$admin->createToken('a')->plainTextToken];

        $storeResponse = $this->postJson('/api/v1/beneficiaries', [
            'family' => [
                'head_name' => 'أسرة أضافها الأدمن',
                'members_count' => 1,
                'housing_status' => 'rented',
            ],
            'beneficiary' => [
                'national_id' => 'NID-ADMIN-CREATED-001',
                'name' => 'مستفيد أضافه الأدمن',
            ],
        ], $adminHeaders);

        $storeResponse->assertCreated();

        $rs = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);

        $response = $this->getJson('/api/v1/beneficiaries', $this->recordingSecretaryHeaders($rs));

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name');
        $this->assertContains('مستفيد أضافه الأدمن', $names);
    }

    public function test_beneficiary_index_search_matches_name_national_id_or_family_code(): void
    {
        $sec = User::factory()->create(['role' => UserRole::Secretary->value]);
        $family = Family::factory()->create(['family_code' => 'FAM-SEARCH-9999']);
        Beneficiary::factory()->create([
            'family_id' => $family->id,
            'name' => 'خالد المعتمد للبحث',
            'national_id' => 'NID-SEARCH-XYZ',
        ]);

        $r1 = $this->getJson('/api/v1/beneficiaries?search='.urlencode('خالد'), $this->secretaryHeaders($sec));
        $r1->assertOk();
        $this->assertGreaterThanOrEqual(1, count($r1->json('data')));

        $r2 = $this->getJson('/api/v1/beneficiaries?search='.urlencode('SEARCH-9999'), $this->secretaryHeaders($sec));
        $r2->assertOk();
        $this->assertGreaterThanOrEqual(1, count($r2->json('data')));

        $r3 = $this->getJson('/api/v1/beneficiaries?search=NID-SEARCH', $this->secretaryHeaders($sec));
        $r3->assertOk();
        $this->assertGreaterThanOrEqual(1, count($r3->json('data')));
    }

    public function test_beneficiary_index_filters_by_enrollment_status_and_category(): void
    {
        $rs = User::factory()->create(['role' => UserRole::RecordingSecretary->value]);
        $headers = $this->recordingSecretaryHeaders($rs);

        $approvedFamily = Family::factory()->create([
            'enrollment_status' => 'approved',
            'head_name' => 'أسرة معتمدة',
        ]);
        $pendingFamily = Family::factory()->create([
            'enrollment_status' => 'pending_board',
            'head_name' => 'أسرة بانتظار',
        ]);

        $financialCategoryId = Category::query()->where('name', 'financial')->firstOrFail()->id;

        Beneficiary::factory()->create([
            'family_id' => $approvedFamily->id,
            'name' => 'رب معتمد',
            'is_head_of_family' => true,
            'category_id' => $financialCategoryId,
        ]);
        Beneficiary::factory()->create([
            'family_id' => $pendingFamily->id,
            'name' => 'رب بانتظار',
            'is_head_of_family' => true,
        ]);

        $approvedResponse = $this->getJson(
            '/api/v1/beneficiaries?enrollment_status=approved&heads_only=1',
            $headers,
        );
        $approvedResponse->assertOk();
        $approvedNames = collect($approvedResponse->json('data'))->pluck('name');
        $this->assertContains('رب معتمد', $approvedNames);
        $this->assertNotContains('رب بانتظار', $approvedNames);

        $categoryResponse = $this->getJson(
            '/api/v1/beneficiaries?category_id='.$financialCategoryId.'&heads_only=1',
            $headers,
        );
        $categoryResponse->assertOk();
        $categoryNames = collect($categoryResponse->json('data'))->pluck('name');
        $this->assertContains('رب معتمد', $categoryNames);
        $this->assertNotContains('رب بانتظار', $categoryNames);
    }

    public function test_secretary_can_store_lab_report_with_attachment(): void
    {
        Storage::fake('local');

        $sec = User::factory()->create(['role' => UserRole::Secretary->value]);
        $beneficiary = Beneficiary::factory()->create();

        $file = UploadedFile::fake()->create('cbc.pdf', 120, 'application/pdf');

        $response = $this->post(
            '/api/v1/beneficiaries/'.$beneficiary->id.'/lab-reports',
            [
                'title' => 'تقرير صورة دم كاملة',
                'findings' => 'قيم ضمن المعايير وفق المرجعة السريعة',
                'attachment' => $file,
            ],
            $this->secretaryHeaders($sec),
        );

        $response->assertCreated()
            ->assertJsonPath('report.title', 'تقرير صورة دم كاملة');

        Storage::disk('local')->assertExists((string) $response->json('report.attachment_path'));
    }

    public function test_beneficiary_show_returns_loaded_family(): void
    {
        $sec = User::factory()->create(['role' => UserRole::Secretary->value]);
        $beneficiary = Beneficiary::factory()->create();

        $this->getJson('/api/v1/beneficiaries/'.$beneficiary->id, $this->secretaryHeaders($sec))
            ->assertOk()
            ->assertJsonPath('beneficiary.id', $beneficiary->id)
            ->assertJsonStructure([
                'beneficiary' => [
                    'id',
                    'family',
                    'category',
                ],
            ]);
    }
}
