
'use client';

import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import { CategoryList } from '@/components/categories/category-list';
import { CategoryForm } from '@/components/categories/category-form';
import type { Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function CategoriesPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  // TODO: Replace with Supabase data fetching
  const isDashboardLoading = true;
  const allData = { categories: [], expenses: [], checks: [] };

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { categories, expenses, checks } = allData;

  const handleFormSubmit = useCallback(async (values: Omit<Category, 'id'>) => {
     // TODO: Implement Supabase logic
    toast({ title: "در حال توسعه", description: "عملیات ثبت دسته‌بندی هنوز پیاده‌سازی نشده است."});
  }, [user, toast]);

  const handleDelete = useCallback(async (categoryId: string) => {
    // TODO: Implement Supabase logic
    toast({ title: "در حال توسعه", description: "عملیات حذف دسته‌بندی هنوز پیاده‌سازی نشده است."});
  }, [user, toast, expenses, checks]);

  const handleEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  }, []);
  
  const handleAddNew = useCallback(() => {
    setEditingCategory(null);
    setIsFormOpen(true);
  }, []);
  
  const handleCancelForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingCategory(null);
  }, []);


  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Link href="/" passHref>
              <Button variant="ghost" size="icon" className="md:hidden">
                  <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            مدیریت دسته‌بندی‌ها
          </h1>
        </div>
        {!isFormOpen && (
            <div className="hidden md:block">
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    افزودن دسته‌بندی
                </Button>
            </div>
        )}
      </div>

      {isLoading ? (
          <div className="space-y-4 mt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : isFormOpen ? (
        <CategoryForm
          onSubmit={handleFormSubmit}
          initialData={editingCategory}
          onCancel={handleCancelForm}
          isSubmitting={isSubmitting}
        />
      ) : (
        <CategoryList
          categories={categories || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Floating Action Button for Mobile */}
      {!isFormOpen && (
        <div className="md:hidden fixed bottom-20 right-4 z-50">
            <Button
              onClick={handleAddNew}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg"
              aria-label="افزودن دسته‌بندی"
            >
              <Plus className="h-6 w-6" />
            </Button>
        </div>
      )}
    </div>
  );
}
