<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_prescription_credits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('beneficiary_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('prescription_reference', 120)->nullable();
            $table->string('notes', 500)->nullable();
            $table->foreignId('credited_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('credited_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_prescription_credits');
    }
};
