<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('beneficiaries', function (Blueprint $table): void {
            $table->decimal('medical_wallet_balance', 14, 2)->default(0)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('beneficiaries', function (Blueprint $table): void {
            $table->dropColumn('medical_wallet_balance');
        });
    }
};
