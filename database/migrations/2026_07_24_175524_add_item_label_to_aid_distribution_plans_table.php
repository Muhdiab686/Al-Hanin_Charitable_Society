<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aid_distribution_plans', function (Blueprint $table): void {
            $table->string('item_label', 255)->nullable()->after('aid_type');
        });
    }

    public function down(): void
    {
        Schema::table('aid_distribution_plans', function (Blueprint $table): void {
            $table->dropColumn('item_label');
        });
    }
};
