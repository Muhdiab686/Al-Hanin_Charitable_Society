<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('volunteer_opportunity_registrations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('volunteer_opportunity_id');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('registered_at');
            $table->timestamps();

            $table->foreign('volunteer_opportunity_id', 'vor_opportunity_fk')
                ->references('id')
                ->on('volunteer_opportunities')
                ->cascadeOnDelete();
            $table->unique(['volunteer_opportunity_id', 'user_id'], 'opportunity_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('volunteer_opportunity_registrations');
    }
};
