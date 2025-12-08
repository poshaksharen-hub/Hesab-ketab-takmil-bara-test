
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction, getDocs, query, where } from 'firebase/firestore';
import { PayeeList } from '@/components/payees/payee-list';
import { PayeeForm } from '@/components/payees/payee-form';
import type { Payee } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';

const FAMILY_DATA_DOC = 'shared-data';

export default function PayeesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();


  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPayee, setEditingPayee] = React.useState<Payee | null>(null);

  const { payees, checks, expenses, loans, previousDebts } = allData;

  const handleFormSubmit = React.useCallback(async (values: Omit<Payee, 'id'>) => {
    if (!user || !firestore) return;
    
    const payeesColRef = collection(firestore, 'family-data', FAMILY_DATA_DOC, 'payees');

    if (editingPayee) {
        const payeeRef = doc(payeesColRef, editingPayee.id);
        updateDocumentNonBlocking(payeeRef, values);
        toast({ title: "موفقیت", description: "طرف حساب با موفقیت ویرایش شد." });
    } else {
        addDocumentNonBlocking(payeesColRef, values)
            .then((docRef) => {
                if(docRef) {
                  updateDoc(docRef, { id: docRef.id });
                  toast({ title: "موفقیت", description: "طرف حساب جدید با موفقیت اضافه شد." });
                }
            });
    }
    setIsFormOpen(false);
    setEditingPayee(null);
  }, [user, firestore, editingPayee, toast]);

  const handleDelete = React.useCallback(async (payeeId: string) => {
    if (!user || !firestore || !checks || !expenses || !loans || !previousDebts) return;
    const payeeRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'payees', payeeId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const isUsedInChecks = checks.some(c => c.payeeId === payeeId);
            if (isUsedInChecks) {
                throw new Error("امکان حذف وجود ندارد. این طرف حساب در یک یا چند چک استفاده شده است.");
            }
            const isUsedInExpenses = expenses.some(e => e.payeeId === payeeId);
            if (isUsedInExpenses) {
                throw new Error("امکان حذف وجود ندارد. این طرف حساب در یک یا چند هزینه استفاده شده است.");
            }
            const isUsedInLoans = loans.some(l => l.payeeId === payeeId);
             if (isUsedInLoans) {
                throw new Error("امکان حذف وجود ندارد. این طرف حساب در یک یا چند وام استفاده شده است.");
            }
            const isUsedInDebts = previousDebts.some(d => d.payeeId === payeeId);
            if (isUsedInDebts) {
                throw new Error("امکان حذف وجود ندارد. این طرف حساب در یک یا چند بدهی متفرقه استفاده شده است.");
            }
            
            transaction.delete(payeeRef);
        });

        toast({ title: "موفقیت", description: "طرف حساب با موفقیت حذف شد." });
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
            throw new FirestorePermissionError({
                path: payeeRef.path,
                operation: 'delete',
            });
        } else {
            toast({
                variant: "destructive",
                title: "خطا در حذف",
                description: error.message || "مشکلی در حذف طرف حساب پیش آمد.",
            });
        }
    }
  }, [user, firestore, toast, checks, expenses, loans, previousDebts]);

  const handleEdit = React.useCallback((payee: Payee) => {
    setEditingPayee(payee);
    setIsFormOpen(true);
  }, []);
  
  const handleAddNew = React.useCallback(() => {
    setEditingPayee(null);
    setIsFormOpen(true);
  }, []);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مدیریت طرف حساب‌ها
        </h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          افزودن طرف حساب
        </Button>
      </div>

      {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : isFormOpen ? (
        <PayeeForm
          isOpen={isFormOpen}
          setIsOpen={setIsOpen}
          onSubmit={handleFormSubmit}
          initialData={editingPayee}
        />
      ) : (
        <PayeeList
          payees={payees || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
