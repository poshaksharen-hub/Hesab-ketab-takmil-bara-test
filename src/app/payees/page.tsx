
'use client';

import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { PayeeList } from '@/components/payees/payee-list';
import { PayeeForm } from '@/components/payees/payee-form';
import type { Payee } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';

const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

export default function PayeesPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPayee, setEditingPayee] = React.useState<Payee | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { firestore, payees, checks, expenses, loans, previousDebts } = allData;

  const handleFormSubmit = useCallback(async (values: Omit<Payee, 'id'>) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    
    const payeesColRef = collection(firestore, FAMILY_DATA_DOC_PATH, 'payees');
    
    const onComplete = () => {
        setIsSubmitting(false);
        setIsFormOpen(false);
        setEditingPayee(null);
    };

    if (editingPayee) {
        const payeeRef = doc(payeesColRef, editingPayee.id);
        updateDoc(payeeRef, values)
            .then(() => {
                toast({ title: "موفقیت", description: "طرف حساب با موفقیت ویرایش شد." });
                onComplete();
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({ path: payeeRef.path, operation: 'update', requestResourceData: values });
                errorEmitter.emit('permission-error', permissionError);
                setIsSubmitting(false);
            });

    } else {
        addDoc(payeesColRef, values)
            .then((docRef) => {
                if(docRef) {
                  updateDoc(docRef, { id: docRef.id });
                  toast({ title: "موفقیت", description: "طرف حساب جدید با موفقیت اضافه شد." });
                  onComplete();
                }
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({ path: payeesColRef.path, operation: 'create', requestResourceData: values });
                errorEmitter.emit('permission-error', permissionError);
                setIsSubmitting(false);
            });
    }
  }, [user, firestore, editingPayee, toast]);

  const handleDelete = useCallback(async (payeeId: string) => {
    if (!user || !firestore) return;
    const payeeRef = doc(firestore, FAMILY_DATA_DOC_PATH, 'payees', payeeId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const usedIn = [];
            if ((checks || []).some(c => c.payeeId === payeeId)) {
                usedIn.push('چک');
            }
            if ((expenses || []).some(e => e.payeeId === payeeId)) {
                usedIn.push('هزینه');
            }
            if ((loans || []).some(l => l.payeeId === payeeId)) {
                usedIn.push('وام');
            }
            if ((previousDebts || []).some(d => d.payeeId === payeeId)) {
                usedIn.push('بدهی');
            }
            
            if (usedIn.length > 0) {
                 throw new Error(`امکان حذف وجود ندارد. این طرف حساب در یک یا چند تراکنش (${usedIn.join(', ')}) استفاده شده است.`);
            }
            
            transaction.delete(payeeRef);
        });

        toast({ title: "موفقیت", description: "طرف حساب با موفقیت حذف شد." });
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({
                path: payeeRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: "destructive",
                title: "خطا در حذف",
                description: error.message || "مشکلی در حذف طرف حساب پیش آمد.",
            });
        }
    }
  }, [user, firestore, toast, checks, expenses, loans, previousDebts]);

  const handleEdit = useCallback((payee: Payee) => {
    setEditingPayee(payee);
    setIsFormOpen(true);
  }, []);
  
  const handleAddNew = useCallback(() => {
    setEditingPayee(null);
    setIsFormOpen(true);
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
            مدیریت طرف حساب‌ها
          </h1>
        </div>
        <div className="hidden md:block">
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                افزودن طرف حساب
            </Button>
        </div>
      </div>

      { isFormOpen && (
        <PayeeForm
            isOpen={isFormOpen}
            setIsOpen={setIsFormOpen}
            onSubmit={handleFormSubmit}
            initialData={editingPayee}
            isSubmitting={isSubmitting}
        />
      )}

      {isLoading ? (
          <div className="space-y-4 mt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : !isFormOpen && (
        <PayeeList
          payees={payees || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Floating Action Button for Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
          <Button
            onClick={handleAddNew}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            aria-label="افزودن طرف حساب"
          >
            <Plus className="h-6 w-6" />
          </Button>
      </div>
    </div>
  );
}
