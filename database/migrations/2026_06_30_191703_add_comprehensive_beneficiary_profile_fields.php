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
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('goal_amount', 14, 2);
            $table->decimal('raised_amount', 14, 2)->default(0);
            $table->string('status')->default('active');
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->string('image_url')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('families', function (Blueprint $table) {
            $table->string('registration_number')->nullable()->unique()->after('id');
            $table->date('registration_date')->nullable()->after('registration_number');
            $table->string('full_family_name')->nullable()->after('head_name');
            $table->string('province')->nullable()->after('address');
            $table->string('city')->nullable()->after('province');
            $table->string('neighborhood')->nullable()->after('city');
            $table->string('housing_status')->nullable()->after('neighborhood');
            $table->json('previous_charity_aid')->nullable()->after('monthly_income');
            $table->json('urgent_needs')->nullable()->after('previous_charity_aid');
            $table->string('follow_up_status')->default('under_review')->after('enrollment_status');
            $table->date('re_evaluation_date')->nullable()->after('follow_up_status');
            $table->json('charity_aid_history')->nullable()->after('re_evaluation_date');
            $table->timestamp('profile_completed_at')->nullable()->after('charity_aid_history');
            $table->boolean('system_generated_credentials')->default(false)->after('profile_completed_at');
        });

        Schema::table('beneficiaries', function (Blueprint $table) {
            $table->string('marital_status')->nullable()->after('gender');
            $table->string('education_level')->nullable()->after('marital_status');
            $table->string('employment_status')->nullable()->after('education_level');
            $table->string('profession')->nullable()->after('employment_status');
            $table->string('workplace')->nullable()->after('profession');
            $table->string('income_type')->nullable()->after('workplace');
            $table->decimal('monthly_income', 12, 2)->nullable()->after('income_type');
            $table->string('health_status')->nullable()->after('monthly_income');
            $table->text('health_details')->nullable()->after('health_status');
            $table->string('additional_phone')->nullable()->after('phone');
            $table->boolean('is_housewife')->default(false)->after('health_details');
            $table->string('kinship_degree')->nullable()->after('is_housewife');
            $table->string('orphan_status')->nullable()->after('kinship_degree');
            $table->unsignedSmallInteger('age')->nullable()->after('date_of_birth');
        });

        Schema::table('clinic_staff_profiles', function (Blueprint $table) {
            $table->string('specialty')->nullable()->after('user_id');
            $table->text('bio')->nullable()->after('specialty');
        });

        Schema::table('clinic_appointments', function (Blueprint $table) {
            $table->string('requested_specialty')->nullable()->after('reason');
            $table->string('workflow_status')->default('scheduled')->after('status');
            $table->foreignId('approved_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
        });

        Schema::table('donor_chat_messages', function (Blueprint $table) {
            $table->string('recipient_role')->default('recording_secretary')->after('donor_id');
        });

        Schema::table('donations', function (Blueprint $table) {
            $table->boolean('show_donor_name')->default(true)->after('donor_name');
            $table->string('stripe_payment_intent_id')->nullable()->after('receipt_code');
            $table->string('stripe_checkout_session_id')->nullable()->after('stripe_payment_intent_id');
            $table->foreignId('campaign_id')->nullable()->after('registered_by')->constrained()->nullOnDelete();
        });

        Schema::table('aid_distribution_plans', function (Blueprint $table) {
            $table->json('filter_criteria')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');

        Schema::table('aid_distribution_plans', function (Blueprint $table) {
            $table->dropColumn('filter_criteria');
        });

        Schema::table('donations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('campaign_id');
            $table->dropColumn(['show_donor_name', 'stripe_payment_intent_id', 'stripe_checkout_session_id']);
        });

        Schema::table('donor_chat_messages', function (Blueprint $table) {
            $table->dropColumn('recipient_role');
        });

        Schema::table('clinic_appointments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approved_by');
            $table->dropColumn(['requested_specialty', 'workflow_status', 'approved_at']);
        });

        Schema::table('clinic_staff_profiles', function (Blueprint $table) {
            $table->dropColumn(['specialty', 'bio']);
        });

        Schema::table('beneficiaries', function (Blueprint $table) {
            $table->dropColumn([
                'marital_status',
                'education_level',
                'employment_status',
                'profession',
                'workplace',
                'income_type',
                'monthly_income',
                'health_status',
                'health_details',
                'additional_phone',
                'is_housewife',
                'kinship_degree',
                'orphan_status',
                'age',
            ]);
        });

        Schema::table('families', function (Blueprint $table) {
            $table->dropColumn([
                'registration_number',
                'registration_date',
                'full_family_name',
                'province',
                'city',
                'neighborhood',
                'housing_status',
                'previous_charity_aid',
                'urgent_needs',
                'follow_up_status',
                're_evaluation_date',
                'charity_aid_history',
                'profile_completed_at',
                'system_generated_credentials',
            ]);
        });
    }
};
