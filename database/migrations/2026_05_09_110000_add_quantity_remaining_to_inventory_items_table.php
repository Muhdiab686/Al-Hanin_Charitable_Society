<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table): void {
            $table->unsignedInteger('quantity_remaining')->default(0)->after('quantity');
        });

        DB::table('inventory_items')->update([
            'quantity_remaining' => DB::raw('quantity'),
        ]);
    }

    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table): void {
            $table->dropColumn('quantity_remaining');
        });
    }
};
