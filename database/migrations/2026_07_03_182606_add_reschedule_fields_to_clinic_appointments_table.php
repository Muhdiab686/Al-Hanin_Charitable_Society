<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clinic_appointments', function (Blueprint $table): void {
            $table->timestamp('proposed_scheduled_at')->nullable()->after('scheduled_at');
            $table->foreignId('proposed_by')->nullable()->after('approved_by')->constrained('users')->nullOnDelete();
            $table->timestamp('proposal_responded_at')->nullable()->after('approved_at');
            $table->string('proposal_note', 500)->nullable()->after('reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinic_appointments', function (Blueprint $table): void {
            $table->dropForeign(['proposed_by']);
            $table->dropColumn([
                'proposed_scheduled_at',
                'proposed_by',
                'proposal_responded_at',
                'proposal_note',
            ]);
        });
    }
};
