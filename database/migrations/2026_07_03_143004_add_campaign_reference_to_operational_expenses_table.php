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
        Schema::table('operational_expenses', function (Blueprint $table): void {
            $table->foreignId('campaign_id')->nullable()->after('vendor')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('operational_expenses', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('campaign_id');
        });
    }
};
