<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Beneficiary;
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
