<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('families', function (Blueprint $table): void {
            $table->boolean('has_direct_income')->default(false)->after('monthly_income');
            $table->timestamp('aid_paused_at')->nullable()->after('has_direct_income');
            $table->string('aid_pause_reason', 500)->nullable()->after('aid_paused_at');
        });
    }

    public function down(): void
    {
        Schema::table('families', function (Blueprint $table): void {
            $table->dropColumn(['has_direct_income', 'aid_paused_at', 'aid_pause_reason']);
        });
    }
};
