<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('clinic_appointment_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('beneficiary_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained('users')->cascadeOnDelete();
            $table->text('diagnosis');
            $table->text('tests_result')->nullable();
            $table->text('prescription')->nullable();
            $table->decimal('prescription_cost', 14, 2)->nullable();
            $table->string('notes', 500)->nullable();
            $table->timestamp('recorded_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_records');
    }
};
