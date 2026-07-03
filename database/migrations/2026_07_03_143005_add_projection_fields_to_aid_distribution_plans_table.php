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
            $table->string('distribution_frequency', 32)->default('once')->after('distribution_date');
            $table->unsignedTinyInteger('cycles_per_year')->default(1)->after('distribution_frequency');
            $table->decimal('projected_annual_amount', 14, 2)->nullable()->after('total_amount');
            $table->unsignedInteger('projected_annual_units')->nullable()->after('total_units');
            $table->unsignedTinyInteger('completed_cycles')->default(0)->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('aid_distribution_plans', function (Blueprint $table): void {
            $table->dropColumn([
                'distribution_frequency',
                'cycles_per_year',
                'projected_annual_amount',
                'projected_annual_units',
                'completed_cycles',
            ]);
        });
    }
};
