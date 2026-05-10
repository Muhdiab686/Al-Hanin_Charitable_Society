<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('volunteer_opportunities', 'activity_kind')) {
            Schema::table('volunteer_opportunities', function (Blueprint $table): void {
                $table->string('activity_kind', 32)->default('general')->after('status');
            });
        }

        if (! Schema::hasTable('bf_vol_opp_links')) {
            Schema::create('bf_vol_opp_links', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('beneficiary_id')->constrained()->cascadeOnDelete();
                $table->foreignId('volunteer_opportunity_id')->constrained('volunteer_opportunities')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['beneficiary_id', 'volunteer_opportunity_id'], 'bf_vol_opp_pair');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bf_vol_opp_links');

        if (Schema::hasColumn('volunteer_opportunities', 'activity_kind')) {
            Schema::table('volunteer_opportunities', function (Blueprint $table): void {
                $table->dropColumn('activity_kind');
            });
        }
    }
};
