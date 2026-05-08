<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('volunteer_opportunities', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->string('description', 1000)->nullable();
            $table->unsignedInteger('required_slots');
            $table->unsignedInteger('filled_slots')->default(0);
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->string('status', 32)->default('open');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('volunteer_opportunities');
    }
};
