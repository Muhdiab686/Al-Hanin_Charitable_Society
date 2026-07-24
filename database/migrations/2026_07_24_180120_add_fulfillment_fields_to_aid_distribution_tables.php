<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aid_distribution_plans', function (Blueprint $table): void {
            $table->foreignId('inventory_item_id')
                ->nullable()
                ->after('item_label')
                ->constrained('inventory_items')
                ->nullOnDelete();
        });

        Schema::table('aid_distribution_plan_lines', function (Blueprint $table): void {
            $table->unsignedInteger('last_fulfilled_cycle')->default(0)->after('allocation_note');
            $table->foreignId('last_aid_request_id')
                ->nullable()
                ->after('last_fulfilled_cycle')
                ->constrained('aid_requests')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('aid_distribution_plan_lines', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('last_aid_request_id');
            $table->dropColumn('last_fulfilled_cycle');
        });

        Schema::table('aid_distribution_plans', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('inventory_item_id');
        });
    }
};
