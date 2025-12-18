
'use client';

import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { CategoryList } from '@/components/categories/category-list';
import { CategoryForm } from '@/components/categories/category-form';
import type { Category, Expense, Check } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';

const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

export default function CategoriesPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  const { firestore, categories, expenses, checks } = allData;

  const handleFormSubmit = useCallback(async (values: Omit<Category, 'id'>) => {
    if (!user || !firestore) return;

    const categoriesColRef = collection(firestore, FAMILY_DATA_DOC_PATH, 'categories');

    if (editingCategory) {
        const categoryRef = doc(categoriesColRef, editingCategory.id);
        updateDoc(categoryRef, values)
            .then(() => toast({ title: "موفقیت", description: "دسته‌بندی با موفقیت ویرایش شد." }))
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({ path: categoryRef.path, operation: 'update', requestResourceData: values });
                errorEmitter.emit('permission-error', permissionError);
            });
    } else {
        const newCategoryData = { ...values, id: '' };
        addDoc(categoriesColRef, newCategoryData)
            .then((docRef) => {
                if (docRef) {
                  updateDoc(docRef, { id: docRef.id });
                  toast({ title: "موفقیت", description: "دسته‌بندی جدید با موفقیت اضافه شد." });
                }
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({ path: categoriesColRef.path, operation: 'create', requestResourceData: newCategoryData });
                errorEmitter.emit('permission-error', permissionError);
            });
    }
    setIsFormOpen(false);
    setEditingCategory(null);
  }, [user, firestore, editingCategory, toast]);

  const handleDelete = useCallback(async (categoryId: string) => {
    if (!user || !firestore) return;
    const categoryRef = doc(firestore, FAMILY_DATA_DOC_PATH, 'categories', categoryId);

    try {
        await runTransaction(firestore, async (transaction) => {
            // Check for usage in expenses
            const isUsedInExpenses = (expenses || []).some(e => e.categoryId === categoryId);
            if (isUsedInExpenses) {
                throw new Error("امکان حذف وجود ندارد. این دسته‌بندی در یک یا چند هزینه استفاده شده است.");
            }
            
            // Check for usage in checks
            const isUsedInChecks = (checks || []).some(c => c.categoryId === categoryId);
            if (isUsedInChecks) {
                throw new Error("امکان حذف وجود ندارد. این دسته‌بندی در یک یا چند چک استفاده شده است.");
            }
            
            transaction.delete(categoryRef);
        });

        toast({ title: "موفقیت", description: "دسته‌بندی با موفقیت حذف شد." });
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({ path: categoryRef.path, operation: 'delete' });
             errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: "destructive",
                title: "خطا در حذف",
                description: error.message || "مشکلی در حذف دسته‌بندی پیش آمد.",
            });
        }
    }
  }, [user, firestore, toast, expenses, checks]);

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
