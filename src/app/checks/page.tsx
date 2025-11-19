'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CheckList } from '@/components/checks/check-list';
import { CheckForm } from '@/components/checks/check-form';
import type { Check, BankAccount, Payee, Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';


export default function ChecksPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCheck, setEditingCheck] = React.useState<Check | null>(null);
  
  const { checks, bankAccounts, payees, categories, users } = allData;

  const handleFormSubmit = async (values: Omit<Check, 'id' | 'userId'>) => {
    if (!user || !firestore) return;

    if (editingCheck) {
      const checkRef = doc(firestore, 'users', user.uid, 'checks', editingCheck.id);
      updateDoc(checkRef, values)
        .then(() => {
          toast({ title: "موفقیت", description: "چک با موفقیت ویرایش شد." });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: checkRef.path,
                operation: 'update',
                requestResourceData: values,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    } else {
      const newCheck = {
        ...values,
        userId: user.uid,
        status: 'pending' as 'pending',
      };
      const checksColRef = collection(firestore, 'users', user.uid, 'checks');
      addDoc(checksColRef, newCheck)
        .then(() => {
          toast({ title: "موفقیت", description: "چک جدید با موفقیت ثبت شد." });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: checksColRef.path,
                operation: 'create',
                requestResourceData: newCheck,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
    setIsFormOpen(false);
    setEditingCheck(null);
  };

  const handleClearCheck = async (check: Check) => {
    if (!user || !firestore || check.status === 'cleared') return;
    
    const checkRef = doc(firestore, 'users', check.userId, 'checks', check.id);
    
    const account = bankAccounts.find(acc => acc.id === check.bankAccountId);
    if (!account) {
        toast({ variant: 'destructive', title: "خطا", description: "حساب بانکی چک یافت نشد." });
        return;
    }
    const isShared = !!account.isShared;
    const ownerId = account.userId;
    
    const bankAccountRef = doc(firestore, isShared ? `shared/data/bankAccounts/${account.id}` : `users/${ownerId}/bankAccounts/${account.id}`);

    try {
      await runTransaction(firestore, async (transaction) => {
        const bankAccountDoc = await transaction.get(bankAccountRef);
        const availableBalance = bankAccountDoc.data()!.balance - (bankAccountDoc.data()!.blockedBalance || 0);

        if (!bankAccountDoc.exists() || availableBalance < check.amount) {
          throw new Error("موجودی حساب برای پاس کردن چک کافی نیست.");
        }

        transaction.update(checkRef, { status: 'cleared' });
        const newBalance = bankAccountDoc.data()!.balance - check.amount;
        transaction.update(bankAccountRef, { balance: newBalance });

        const expenseOwnerId = ownerId;
        const expenseRef = doc(collection(firestore, 'users', expenseOwnerId, 'expenses'));
        transaction.set(expenseRef, {
            id: expenseRef.id,
            userId: expenseOwnerId,
            registeredByUserId: user.uid,
            amount: check.amount,
            bankAccountId: check.bankAccountId,
            categoryId: check.categoryId,
            date: new Date().toISOString(),
            description: `پاس کردن چک به: ${payees?.find(p => p.id === check.payeeId)?.name || 'نامشخص'}`,
            type: 'expense',
            checkId: check.id,
            createdAt: serverTimestamp(),
        });
      });
      toast({ title: "موفقیت", description: "چک با موفقیت پاس شد و از حساب شما کسر گردید." });
    } catch (error: any) {
       if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({
                path: checkRef.path, // Simplified path for the transaction
                operation: 'write', 
            });
            errorEmitter.emit('permission-error', permissionError);
       } else {
            toast({
                variant: "destructive",
                title: "خطا در پاس کردن چک",
                description: error.message || "مشکلی در عملیات پاس کردن چک پیش آمد.",
            });
       }
    }
  };

  const handleDelete = async (check: Check) => {
    if (!user || !firestore) return;
    const checkRef = doc(firestore, 'users', check.userId, 'checks', check.id);
    try {
        await runTransaction(firestore, async (transaction) => {
            if (check.status === 'cleared') {
                const account = bankAccounts.find(acc => acc.id === check.bankAccountId);
                 if (account) {
                    const isShared = !!account.isShared;
                    const ownerId = account.userId;
                    const bankAccountRef = doc(firestore, isShared ? `shared/data/bankAccounts/${account.id}` : `users/${ownerId}/bankAccounts/${account.id}`);

                    const bankAccountDoc = await transaction.get(bankAccountRef);
                    if(bankAccountDoc.exists()){
                        const currentBalance = bankAccountDoc.data().balance;
                        transaction.update(bankAccountRef, { balance: currentBalance + check.amount });
                    }
                }

                // Delete the expense from the correct user's collection
                const expenseToDeleteQuery = query(collection(firestore, 'users', account!.userId, 'expenses'), where("checkId", "==", check.id));
                const expenseSnapshot = await getDocs(expenseToDeleteQuery);
                expenseSnapshot.forEach((doc) => {
                    transaction.delete(doc.ref);
                });
            }
            
            transaction.delete(checkRef);
        });

        toast({ title: "موفقیت", description: "چک با موفقیت حذف شد." });
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({
                path: checkRef.path, // Simplified path
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: "destructive",
                title: "خطا در حذف چک",
                description: error.message || "مشکلی در حذف چک پیش آمد.",
            });
        }
    }
  };

  const handleEdit = (check: Check) => {
    if (check.status === 'cleared') {
      toast({
        variant: "destructive",
        title: "امکان ویرایش وجود ندارد",
        description: "چک‌های پاس شده قابل ویرایش نیستند. برای اصلاح، لطفا چک را حذف و مجددا ثبت کنید.",
      });
      return;
    }
    setEditingCheck(check);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingCheck(null);
    setIsFormOpen(true);
  };
  
  const isLoading = isUserLoading || isDashboardLoading;
  
  const userPayees = payees.filter(p => p.userId === user?.uid);
  const userCategories = categories.filter(c => c.userId === user?.uid);

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مدیریت چک‌ها
        </h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          ثبت چک جدید
        </Button>
      </div>

      {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : isFormOpen ? (
        <CheckForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingCheck}
          bankAccounts={bankAccounts || []}
          payees={userPayees || []}
          categories={userCategories || []}
          users={users}
        />
      ) : (
        <CheckList
          checks={checks || []}
          bankAccounts={bankAccounts || []}
          payees={payees || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClear={handleClearCheck}
        />
      )}
    </main>
  );
}
