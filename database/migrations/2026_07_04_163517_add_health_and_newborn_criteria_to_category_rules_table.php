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
            $table->boolean('requires_health_condition')->default(false)->after('requires_medical_case');
            $table->unsignedInteger('min_newborns')->nullable()->after('requires_health_condition');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('category_rules', function (Blueprint $table) {
            $table->dropColumn(['requires_health_condition', 'min_newborns']);
        });
    }
};
