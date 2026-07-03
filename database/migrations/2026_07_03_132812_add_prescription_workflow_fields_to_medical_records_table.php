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
        Schema::table('medical_records', function (Blueprint $table): void {
            $table->string('prescription_workflow_status', 40)->nullable()->after('prescription_cost');
            $table->foreignId('prescription_reviewed_by')->nullable()->after('prescription_workflow_status')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('prescription_reviewed_at')->nullable()->after('prescription_reviewed_by');
            $table->string('prescription_review_note', 500)->nullable()->after('prescription_reviewed_at');
            $table->foreignId('prescription_disbursed_by')->nullable()->after('prescription_review_note')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('prescription_disbursed_at')->nullable()->after('prescription_disbursed_by');
            $table->foreignId('prescription_disbursement_transaction_id')->nullable()
                ->after('prescription_disbursed_at')
                ->constrained('financial_transactions')
                ->nullOnDelete();

            $table->index('prescription_workflow_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('medical_records', function (Blueprint $table): void {
            $table->dropForeign(['prescription_reviewed_by']);
            $table->dropForeign(['prescription_disbursed_by']);
            $table->dropForeign(['prescription_disbursement_transaction_id']);
            $table->dropIndex(['prescription_workflow_status']);

            $table->dropColumn([
                'prescription_workflow_status',
                'prescription_reviewed_by',
                'prescription_reviewed_at',
                'prescription_review_note',
                'prescription_disbursed_by',
                'prescription_disbursed_at',
                'prescription_disbursement_transaction_id',
            ]);
        });
    }
};
