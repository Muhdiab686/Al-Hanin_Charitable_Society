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
        Schema::table('clinic_appointments', function (Blueprint $table): void {
            $table->string('payout_status', 32)->nullable()->after('status');
            $table->foreignId('doctor_payout_request_id')
                ->nullable()
                ->after('payout_status')
                ->constrained('doctor_payout_requests')
                ->nullOnDelete();

            $table->index(['doctor_id', 'status', 'payout_status'], 'clinic_appointments_doctor_payout_lookup');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinic_appointments', function (Blueprint $table): void {
            $table->dropIndex('clinic_appointments_doctor_payout_lookup');
            $table->dropForeign(['doctor_payout_request_id']);
            $table->dropColumn(['payout_status', 'doctor_payout_request_id']);
        });
    }
};
