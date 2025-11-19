
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction, getDocs, query, where } from 'firebase/firestore';
import { CategoryList } from '@/components/categories/category-list';
import { CategoryForm } from '@/components/categories/category-form';
import type { Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function CategoriesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  const categoriesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'categories') : null),
    [firestore, user]
  );
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

  const handleFormSubmit = async (values: Omit<Category, 'id' | 'userId'>) => {
    if (!user || !firestore) return;

    if (editingCategory) {
        const categoryRef = doc(firestore, 'users', user.uid, 'categories', editingCategory.id);
        updateDoc(categoryRef, values)
        .then(() => {
            toast({ title: "موفقیت", description: "دسته‌بندی با موفقیت ویرایش شد." });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: categoryRef.path,
                operation: 'update',
                requestResourceData: values,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    } else {
        const newCategory = {
            ...values,
            userId: user.uid,
        };
        const categoriesColRef = collection(firestore, 'users', user.uid, 'categories');
        addDoc(categoriesColRef, newCategory)
        .then(() => {
            toast({ title: "موفقیت", description: "دسته‌بندی جدید با موفقیت اضافه شد." });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: categoriesColRef.path,
                operation: 'create',
                requestResourceData: newCategory,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async (categoryId: string) => {
    if (!user || !firestore) return;
    const categoryRef = doc(firestore, 'users', user.uid, 'categories', categoryId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const expensesRef = collection(firestore, 'users', user.uid, 'expenses');
            const expensesQuery = query(expensesRef, where('categoryId', '==', categoryId));
            const expensesSnapshot = await getDocs(expensesQuery);

            if (!expensesSnapshot.empty) {
                throw new Error("امکان حذف وجود ندارد. این دسته‌بندی در یک یا چند هزینه استفاده شده است.");
            }
            
            const checksRef = collection(firestore, 'users', user.uid, 'checks');
            const checksQuery = query(checksRef, where('categoryId', '==', categoryId));
            const checksSnapshot = await getDocs(checksQuery);

            if (!checksSnapshot.empty) {
                throw new Error("امکان حذف وجود ندارد. این دسته‌بندی در یک یا چند چک استفاده شده است.");
            }
            
            transaction.delete(categoryRef);
        });

        toast({ title: "موفقیت", description: "دسته‌بندی با موفقیت حذف شد." });
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({
                path: categoryRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: "destructive",
                title: "خطا در حذف",
                description: error.message || "مشکلی در حذف دسته‌بندی پیش آمد.",
            });
        }
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const isLoading = isUserLoading || isLoadingCategories;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مدیریت دسته‌بندی‌ها
        </h1>
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
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingCategory}
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
