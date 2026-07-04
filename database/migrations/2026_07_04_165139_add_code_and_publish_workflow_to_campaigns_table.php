<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('campaign_code', 40)->nullable()->after('id');
            $table->timestamp('published_at')->nullable()->after('status');
            $table->timestamp('closed_at')->nullable()->after('published_at');
        });

        foreach (DB::table('campaigns')->whereNull('campaign_code')->get(['id']) as $campaign) {
            DB::table('campaigns')->where('id', $campaign->id)->update([
                'campaign_code' => 'CMP-'.str_pad((string) $campaign->id, 6, '0', STR_PAD_LEFT),
            ]);
        }

        Schema::table('campaigns', function (Blueprint $table) {
            $table->unique('campaign_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropUnique(['campaign_code']);
            $table->dropColumn(['campaign_code', 'published_at', 'closed_at']);
        });
    }
};
