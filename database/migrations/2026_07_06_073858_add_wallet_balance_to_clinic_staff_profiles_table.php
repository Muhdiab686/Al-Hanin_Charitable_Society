<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_staff_profiles', function (Blueprint $table): void {
            $table->decimal('wallet_balance', 14, 2)->default(0)->after('consultation_fee');
        });
    }

    public function down(): void
    {
        Schema::table('clinic_staff_profiles', function (Blueprint $table): void {
            $table->dropColumn('wallet_balance');
        });
    }
};
