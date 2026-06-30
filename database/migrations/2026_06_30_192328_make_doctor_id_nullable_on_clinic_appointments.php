<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_appointments', function (Blueprint $table) {
            $table->dropForeign(['doctor_id']);
            $table->foreignId('doctor_id')->nullable()->change()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('clinic_appointments', function (Blueprint $table) {
            $table->dropForeign(['doctor_id']);
            $table->foreignId('doctor_id')->nullable(false)->change()->constrained('users')->cascadeOnDelete();
        });
    }
};
