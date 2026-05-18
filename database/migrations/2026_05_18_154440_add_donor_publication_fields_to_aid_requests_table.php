<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aid_requests', function (Blueprint $table) {
            $table->string('public_title')->nullable()->after('description');
            $table->text('public_summary')->nullable()->after('public_title');
            $table->timestamp('published_for_donors_at')->nullable()->after('submitted_at');
            $table->foreignId('published_by')->nullable()->after('published_for_donors_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('aid_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('published_by');
            $table->dropColumn(['public_title', 'public_summary', 'published_for_donors_at']);
        });
    }
};
