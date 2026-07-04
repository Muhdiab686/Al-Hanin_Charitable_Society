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
        Schema::table('category_rules', function (Blueprint $table) {
            $table->json('housing_statuses')->nullable()->after('min_newborns');
            $table->unsignedInteger('min_children_under_18')->nullable()->after('housing_statuses');
            $table->unsignedInteger('min_adults')->nullable()->after('min_children_under_18');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('category_rules', function (Blueprint $table) {
            $table->dropColumn(['housing_statuses', 'min_children_under_18', 'min_adults']);
        });
    }
};
