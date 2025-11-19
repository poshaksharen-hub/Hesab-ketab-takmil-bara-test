'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { IncomeList } from '@/components/income/income-list';
import { IncomeForm } from '@/components/income/income-form';
import type { Income, BankAccount, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';

export default function IncomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);

  const { incomes: allIncomes, bankAccounts: allBankAccounts, users: allUsers } = allData;

  const handleFormSubmit = async (values: Omit<Income, 'id' | 'userId' | 'createdAt' | 'registeredByUserId'>) => {
    if (!user || !firestore) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const account = allBankAccounts.find(acc => acc.id === values.bankAccountId);
        if(!account) throw new Error("کارت بانکی یافت نشد");
        const isSharedAccount = !!account.isShared;
        
        const targetCardRef = doc(firestore, isSharedAccount ? `shared/data/bankAccounts/${account.id}` : `users/${account.userId}/bankAccounts/${account.id}`);
        const targetCardDoc = await transaction.get(targetCardRef);
        
        if (!targetCardDoc.exists()) {
          throw new Error("کارت بانکی مورد نظر یافت نشد.");
        }
        const targetCardData = targetCardDoc.data() as BankAccount;

        if (editingIncome) {
          // --- Edit Mode ---
          const oldIncomeRef = doc(firestore, 'users', editingIncome.userId, 'incomes', editingIncome.id);
          
          const oldAccount = allBankAccounts.find(acc => acc.id === editingIncome.bankAccountId);
          if(!oldAccount) throw new Error("کارت بانکی قدیمی یافت نشد.");
          const isOldShared = !!oldAccount.isShared;

          const oldCardRef = doc(firestore, isOldShared ? `shared/data/bankAccounts/${oldAccount.id}` : `users/${oldAccount.userId}/bankAccounts/${oldAccount.id}`);
          
          // 1. Revert previous transaction
          const oldCardDoc = await transaction.get(oldCardRef);
          if (oldCardDoc.exists()) {
              const oldCardData = oldCardDoc.data() as BankAccount;
              transaction.update(oldCardRef, { balance: oldCardData.balance - editingIncome.amount });
          }

          // 2. Apply new transaction
          transaction.update(targetCardRef, { balance: targetCardData.balance + values.amount });

          // 3. Update income document
          transaction.update(oldIncomeRef, { ...values, registeredByUserId: user.uid, updatedAt: serverTimestamp() });
          toast({ title: "موفقیت", description: "درآمد با موفقیت ویرایش شد." });

        } else {
          // --- Create Mode ---
          // 1. Increase balance
          transaction.update(targetCardRef, { balance: targetCardData.balance + values.amount });

          // 2. Create new income document in the bank account owner's collection
          const incomeOwnerId = account.userId;
          const newIncomeRef = doc(collection(firestore, 'users', incomeOwnerId, 'incomes'));
          transaction.set(newIncomeRef, {
            ...values,
            id: newIncomeRef.id,
            userId: incomeOwnerId,
            registeredByUserId: user.uid,
            createdAt: serverTimestamp(),
            category: 'درآمد',
            type: 'income',
          });
          toast({ title: "موفقیت", description: "درآمد جدید با موفقیت ثبت شد." });
        }
      });
      
      setEditingIncome(null);
      setIsFormOpen(false);

    } catch (error: any) {
        if (error instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', error);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در ثبت درآمد",
            description: error.message || "مشکلی در ثبت اطلاعات پیش آمد. لطفا دوباره تلاش کنید.",
          });
        }
    }
  };

  const handleDelete = async (income: Income) => {
    if (!user || !firestore || !allIncomes) return;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const incomeRef = doc(firestore, 'users', income.userId, 'incomes', income.id);
            
            const account = allBankAccounts.find(acc => acc.id === income.bankAccountId);
            if(!account) throw new Error("کارت بانکی یافت نشد");
            const isShared = !!account.isShared;

            const cardRef = doc(firestore, isShared ? `shared/data/bankAccounts/${account.id}` : `users/${account.userId}/bankAccounts/${account.id}`);

            const cardDoc = await transaction.get(cardRef);
            if (cardDoc.exists()) {
                const cardData = cardDoc.data() as BankAccount;
                // Deduct income amount from balance on delete
                transaction.update(cardRef, { balance: cardData.balance - income.amount });
            }
            
            transaction.delete(incomeRef);
        });
        toast({ title: "موفقیت", description: "درآمد با موفقیت حذف شد." });
    } catch (error: any) {
        if (error instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', error);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در حذف درآمد",
            description: error.message || "مشکلی در حذف اطلاعات پیش آمد.",
          });
        }
    }
  };


  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingIncome(null);
    setIsFormOpen(true);
  };

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مدیریت درآمدها
        </h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          ثبت درآمد جدید
        </Button>
      </div>

      {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : isFormOpen ? (
        <IncomeForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingIncome}
          bankAccounts={allBankAccounts}
          user={user}
        />
      ) : (
        <IncomeList
          incomes={allIncomes || []}
          bankAccounts={allBankAccounts || []}
          users={allUsers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
