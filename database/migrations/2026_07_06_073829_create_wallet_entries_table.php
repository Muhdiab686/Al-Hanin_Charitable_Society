<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_entries', function (Blueprint $table): void {
            $table->id();
            $table->string('owner_type', 32);
            $table->unsignedBigInteger('owner_id');
            $table->string('category', 64);
            $table->string('direction', 8);
            $table->decimal('amount', 14, 2)->nullable();
            $table->unsignedInteger('units')->nullable();
            $table->string('unit_label', 64)->nullable();
            $table->text('description');
            $table->nullableMorphs('reference');
            $table->foreignId('financial_transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('recorded_at');
            $table->timestamps();

            $table->index(['owner_type', 'owner_id', 'recorded_at'], 'wallet_entries_owner_recorded');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_entries');
    }
};
