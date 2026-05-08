<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aid_inventory_allocations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('aid_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity');
            $table->foreignId('distributed_by')->constrained('users')->cascadeOnDelete();
            $table->string('notes', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aid_inventory_allocations');
    }
};
