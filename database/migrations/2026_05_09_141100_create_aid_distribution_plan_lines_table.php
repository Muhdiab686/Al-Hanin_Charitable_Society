<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aid_distribution_plan_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('aid_distribution_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('family_id')->constrained()->cascadeOnDelete();
            $table->foreignId('beneficiary_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('allocated_amount', 14, 2)->nullable();
            $table->unsignedInteger('allocated_units')->nullable();
            $table->unsignedInteger('allocation_rank')->default(0);
            $table->string('allocation_note', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aid_distribution_plan_lines');
    }
};
