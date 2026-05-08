<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('donation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('item_code')->unique();
            $table->string('name');
            $table->string('spoilage_category', 32);
            $table->unsignedInteger('quantity')->default(1);
            $table->date('expiry_date')->nullable();
            $table->string('condition_notes', 500)->nullable();
            $table->string('storage_location')->nullable();
            $table->string('status', 32)->default('stored');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
