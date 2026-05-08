<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donations', function (Blueprint $table) {
            $table->id();
            $table->string('type', 32);
            $table->decimal('cash_amount', 14, 2)->nullable();
            $table->string('donor_name')->nullable();
            $table->string('donor_phone', 64)->nullable();
            $table->text('notes')->nullable();
            $table->string('receipt_code')->unique();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};
