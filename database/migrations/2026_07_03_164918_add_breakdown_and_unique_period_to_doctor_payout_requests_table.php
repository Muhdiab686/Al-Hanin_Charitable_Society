<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('doctor_payout_requests', function (Blueprint $table): void {
            $table->decimal('base_salary_amount', 14, 2)->default(0)->after('consultations_count');
            $table->decimal('consultation_fee_amount', 14, 2)->default(0)->after('base_salary_amount');
            $table->decimal('consultations_amount', 14, 2)->default(0)->after('consultation_fee_amount');
            $table->index(['doctor_id', 'period_start', 'period_end'], 'doctor_payout_period_lookup');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doctor_payout_requests', function (Blueprint $table): void {
            $table->dropIndex('doctor_payout_period_lookup');
            $table->dropColumn([
                'base_salary_amount',
                'consultation_fee_amount',
                'consultations_amount',
            ]);
        });
    }
};
