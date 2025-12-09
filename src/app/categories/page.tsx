
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction, getDocs, query, where } from 'firebase/firestore';
import { CategoryList } from '@/components/categories/category-list';
import { CategoryForm } from '@/components/categories/category-form';
import type { Category, Expense, Check } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';

const FAMILY_DATA_DOC = 'shared-data';

export default function CategoriesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();


  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  const { categories, expenses, checks } = allData;

  const handleFormSubmit = React.useCallback(async (values: Omit<Category, 'id'>) => {
    if (!user || !firestore) return;

    const categoriesColRef = collection(firestore, 'family-data', FAMILY_DATA_DOC, 'categories');

    if (editingCategory) {
        const categoryRef = doc(categoriesColRef, editingCategory.id);
        updateDocumentNonBlocking(categoryRef, values);
        toast({ title: "موفقیت", description: "دسته‌بندی با موفقیت ویرایش شد." });
    } else {
        addDocumentNonBlocking(categoriesColRef, { ...values, id: '' }) // Add with an empty ID initially
        .then((docRef) => {
            if (docRef) {
              updateDoc(docRef, { id: docRef.id });
              toast({ title: "موفقیت", description: "دسته‌بندی جدید با موفقیت اضافه شد." });
            }
        });
    }
    setIsFormOpen(false);
    setEditingCategory(null);
  }, [user, firestore, editingCategory, toast]);

  const handleDelete = React.useCallback(async (categoryId: string) => {
    if (!user || !firestore) return;
    const categoryRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'categories', categoryId);

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
             throw new FirestorePermissionError({
                path: categoryRef.path,
                operation: 'delete',
            });
        } else {
            toast({
                variant: "destructive",
                title: "خطا در حذف",
                description: error.message || "مشکلی در حذف دسته‌بندی پیش آمد.",
            });
        }
    }
  }, [user, firestore, toast, expenses, checks]);

  const handleEdit = React.useCallback((category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  }, []);
  
  const handleAddNew = React.useCallback(() => {
    setEditingCategory(null);
    setIsFormOpen(true);
  }, []);

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/">
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
            مدیریت دسته‌بندی‌ها
            </h1>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          افزودن دسته‌بندی
        </Button>
      </div>

      {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : isFormOpen ? (
        <CategoryForm
          onSubmit={handleFormSubmit}
          initialData={editingCategory}
          onCancel={handleCancel}
        />
      ) : (
        <CategoryList
          categories={categories || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
