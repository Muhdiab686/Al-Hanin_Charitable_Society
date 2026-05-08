<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpsertCategoryRuleRequest;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryRuleController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->with('rules')
            ->orderBy('priority')
            ->get();

        return response()->json(['categories' => $categories]);
    }

    public function upsertRule(UpsertCategoryRuleRequest $request, Category $category): JsonResponse
    {
        $rule = $category->rules()->first();
        $validated = $request->validated();

        if ($rule === null) {
            $rule = $category->rules()->create($validated);
        } else {
            $rule->forceFill($validated)->save();
        }

        return response()->json([
            'message' => __('Category rule saved successfully.'),
            'category' => $category->fresh()->load('rules'),
        ]);
    }
}
