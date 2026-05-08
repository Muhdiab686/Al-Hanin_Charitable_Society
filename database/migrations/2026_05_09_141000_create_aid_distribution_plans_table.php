<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aid_distribution_plans', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->string('aid_type', 32);
            $table->date('distribution_date');
            $table->unsignedInteger('eligible_families_count');
            $table->decimal('total_amount', 14, 2)->nullable();
            $table->unsignedInteger('total_units')->nullable();
            $table->string('status', 32)->default('draft');
            $table->string('notes', 1000)->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aid_distribution_plans');
    }
};
