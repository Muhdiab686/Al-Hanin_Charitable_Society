<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_transactions', function (Blueprint $table): void {
            $table->id();
            $table->string('type', 16);
            $table->string('source', 64);
            $table->decimal('amount', 14, 2);
            $table->morphs('reference');
            $table->string('description', 500)->nullable();
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('recorded_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_transactions');
    }
};
