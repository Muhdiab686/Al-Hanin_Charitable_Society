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
        Schema::table('aid_distribution_plans', function (Blueprint $table): void {
            $table->foreignId('campaign_id')
                ->nullable()
                ->after('aid_type')
                ->constrained()
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('aid_distribution_plans', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('campaign_id');
        });
    }
};
