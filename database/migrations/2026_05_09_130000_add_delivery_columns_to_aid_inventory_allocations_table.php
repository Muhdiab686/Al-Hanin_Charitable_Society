<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aid_inventory_allocations', function (Blueprint $table): void {
            $table->foreignId('delivered_by')->nullable()->after('distributed_by')->constrained('users')->nullOnDelete();
            $table->timestamp('delivered_at')->nullable()->after('delivered_by');
            $table->string('delivery_note', 500)->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('aid_inventory_allocations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('delivered_by');
            $table->dropColumn(['delivered_at', 'delivery_note']);
        });
    }
};
