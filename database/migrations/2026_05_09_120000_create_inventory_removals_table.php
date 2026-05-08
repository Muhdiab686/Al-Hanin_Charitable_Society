<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_removals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity');
            $table->string('reason', 32);
            $table->string('notes', 500)->nullable();
            $table->foreignId('removed_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('removed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_removals');
    }
};
