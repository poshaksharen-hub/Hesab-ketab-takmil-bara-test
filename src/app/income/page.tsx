'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { IncomeList } from '@/components/income/income-list';
import { IncomeForm } from '@/components/income/income-form';
import type { Income, BankAccount } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function IncomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);

  const incomesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'incomes') : null),
    [firestore, user]
  );
  const { data: incomes, isLoading: isLoadingIncomes } = useCollection<Income>(incomesQuery);

  const bankAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'bankAccounts') : null),
    [firestore, user]
  );
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
  
  const sharedBankAccountsQuery = useMemoFirebase(
    () => collection(firestore, 'shared', 'bankAccounts'),
    [firestore]
  );
  const { data: sharedBankAccounts, isLoading: isLoadingSharedBankAccounts } = useCollection<BankAccount>(sharedBankAccountsQuery);

  const allBankAccounts = React.useMemo(() => {
    const personal = bankAccounts || [];
    const shared = sharedBankAccounts?.filter(acc => 'members' in acc && user && (acc as any).members[user.uid]) || [];
    return [...personal, ...shared.map(acc => ({...acc, isShared: true}))];
  }, [bankAccounts, sharedBankAccounts, user]);


  const handleFormSubmit = async (values: Omit<Income, 'id' | 'userId' | 'createdAt'>) => {
    if (!user || !firestore) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const targetCardRef = doc(firestore, values.bankAccountId.startsWith('shared-') ? `shared/bankAccounts/${values.bankAccountId.replace('shared-','')}` : `users/${user.uid}/bankAccounts/${values.bankAccountId}`);
        const targetCardDoc = await transaction.get(targetCardRef);
        if (!targetCardDoc.exists()) {
          throw new Error("کارت بانکی مورد نظر یافت نشد.");
        }
        const targetCardData = targetCardDoc.data() as BankAccount;

        if (editingIncome) {
          // --- حالت ویرایش ---
          const oldIncomeRef = doc(firestore, 'users', user.uid, 'incomes', editingIncome.id);
          const oldCardRef = doc(firestore, editingIncome.bankAccountId.startsWith('shared-') ? `shared/bankAccounts/${editingIncome.bankAccountId.replace('shared-','')}` : `users/${user.uid}/bankAccounts/${editingIncome.bankAccountId}`);
          
          // 1. خنثی‌سازی تراکنش قبلی
          const oldCardDoc = await transaction.get(oldCardRef);
          if (oldCardDoc.exists()) {
              const oldCardData = oldCardDoc.data() as BankAccount;
              transaction.update(oldCardRef, { balance: oldCardData.balance - editingIncome.amount });
          }

          // 2. اعمال تراکنش جدید
          transaction.update(targetCardRef, { balance: targetCardData.balance + values.amount });

          // 3. به‌روزرسانی سند درآمد
          transaction.update(oldIncomeRef, { ...values, updatedAt: serverTimestamp() });

        } else {
          // --- حالت ثبت جدید ---
          // 1. افزایش موجودی
          transaction.update(targetCardRef, { balance: targetCardData.balance + values.amount });

          // 2. ایجاد سند درآمد جدید
          const newIncomeRef = doc(collection(firestore, 'users', user.uid, 'incomes'));
          transaction.set(newIncomeRef, {
            ...values,
            id: newIncomeRef.id,
            userId: user.uid,
            createdAt: serverTimestamp(),
          });
        }
      });
      
      setEditingIncome(null);
      setIsFormOpen(false);

    } catch (error) {
      console.error("خطا در ثبت تراکنش:", error);
      // TODO: Show toast notification to user
    }
  };

  const handleDelete = async (incomeId: string) => {
    if (!user || !firestore || !incomes) return;

    const incomeToDelete = incomes.find(inc => inc.id === incomeId);
    if (!incomeToDelete) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const incomeRef = doc(firestore, 'users', user.uid, 'incomes', incomeId);
            const cardRef = doc(firestore, incomeToDelete.bankAccountId.startsWith('shared-') ? `shared/bankAccounts/${incomeToDelete.bankAccountId.replace('shared-','')}`: `users/${user.uid}/bankAccounts/${incomeToDelete.bankAccountId}`);

            const cardDoc = await transaction.get(cardRef);
            if (cardDoc.exists()) {
                const cardData = cardDoc.data() as BankAccount;
                transaction.update(cardRef, { balance: cardData.balance - incomeToDelete.amount });
            }
            
            transaction.delete(incomeRef);
        });
    } catch (error) {
        console.error("خطا در حذف درآمد:", error);
        // TODO: Show toast notification
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

  const isLoading = isUserLoading || isLoadingIncomes || isLoadingBankAccounts || isLoadingSharedBankAccounts;

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
          incomes={incomes || []}
          bankAccounts={allBankAccounts || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
