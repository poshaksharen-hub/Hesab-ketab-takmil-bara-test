
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction, getDocs, query, where } from 'firebase/firestore';
import { PayeeList } from '@/components/payees/payee-list';
import { PayeeForm } from '@/components/payees/payee-form';
import type { Payee } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function PayeesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPayee, setEditingPayee] = React.useState<Payee | null>(null);

  const payeesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'payees') : null),
    [firestore, user]
  );
  const { data: payees, isLoading: isLoadingPayees } = useCollection<Payee>(payeesQuery);

  const handleFormSubmit = async (values: Omit<Payee, 'id' | 'userId'>) => {
    if (!user || !firestore) return;

    try {
        if (editingPayee) {
            const payeeRef = doc(firestore, 'users', user.uid, 'payees', editingPayee.id);
            await updateDoc(payeeRef, values);
            toast({ title: "موفقیت", description: "طرف حساب با موفقیت ویرایش شد." });
        } else {
            const newPayee = {
                ...values,
                userId: user.uid,
            };
            await addDoc(collection(firestore, 'users', user.uid, 'payees'), newPayee);
            toast({ title: "موفقیت", description: "طرف حساب جدید با موفقیت اضافه شد." });
        }
        setIsFormOpen(false);
        setEditingPayee(null);
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "خطا در ثبت طرف حساب",
            description: error.message || "مشکلی در ثبت اطلاعات پیش آمد.",
        });
    }
  };

  const handleDelete = async (payeeId: string) => {
    if (!user || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const checksRef = collection(firestore, 'users', user.uid, 'checks');
            const checksQuery = query(checksRef, where('payeeId', '==', payeeId));
            const checksSnapshot = await getDocs(checksQuery);

            if (!checksSnapshot.empty) {
                throw new Error("امکان حذف وجود ندارد. این طرف حساب در یک یا چند چک استفاده شده است.");
            }
            
            const payeeRef = doc(firestore, 'users', user.uid, 'payees', payeeId);
            transaction.delete(payeeRef);
        });

        toast({ title: "موفقیت", description: "طرف حساب با موفقیت حذف شد." });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در حذف",
            description: error.message || "مشکلی در حذف طرف حساب پیش آمد.",
        });
    }
  };

  const handleEdit = (payee: Payee) => {
    setEditingPayee(payee);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingPayee(null);
    setIsFormOpen(true);
  };

  const isLoading = isUserLoading || isLoadingPayees;

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
          setIsOpen={setIsFormOpen}
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
