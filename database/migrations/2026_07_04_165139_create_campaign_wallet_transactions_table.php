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
        Schema::create('campaign_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_wallet_id')->constrained()->cascadeOnDelete();
            $table->enum('direction', ['credit', 'debit']);
            $table->string('source', 50);
            $table->decimal('amount', 14, 2);
            $table->decimal('balance_after', 14, 2);
            $table->nullableMorphs('reference');
            $table->string('description', 500)->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_wallet_transactions');
    }
};
