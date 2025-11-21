
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp, addDoc } from 'firebase/firestore';
import { IncomeList } from '@/components/income/income-list';
import { IncomeForm } from '@/components/income/income-form';
import type { Income, BankAccount, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { USER_DETAILS } from '@/lib/constants';

const FAMILY_DATA_DOC = 'shared-data';

export default function IncomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);

  const { incomes: allIncomes, bankAccounts: allBankAccounts, users: allUsers } = allData;

  const handleFormSubmit = React.useCallback(async (values: Omit<Income, 'id' | 'createdAt' | 'updatedAt' >) => {
    if (!user || !firestore || !allBankAccounts) return;
  
    try {
      await runTransaction(firestore, async (transaction) => {
        const account = allBankAccounts.find(acc => acc.id === values.bankAccountId);
        if (!account) throw new Error("کارت بانکی یافت نشد");
  
        const targetCardRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'bankAccounts', account.id);
        const targetCardDoc = await transaction.get(targetCardRef);
  
        if (!targetCardDoc.exists()) {
          throw new Error("کارت بانکی مورد نظر یافت نشد.");
        }
        const targetCardData = targetCardDoc.data() as BankAccount;
        
        const balanceBefore = targetCardData.balance;
        const balanceAfter = balanceBefore + values.amount;
  
        // 1. Increase balance
        transaction.update(targetCardRef, { balance: balanceAfter });

        // 2. Create new income document
        const incomesColRef = collection(firestore, 'family-data', FAMILY_DATA_DOC, 'incomes');
        const newIncomeRef = doc(incomesColRef);
        transaction.set(newIncomeRef, {
        ...values,
        id: newIncomeRef.id,
        createdAt: serverTimestamp(),
        balanceAfter: balanceAfter, // Add balance after transaction
        });
        toast({ title: "موفقیت", description: "درآمد جدید با موفقیت ثبت شد." });
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
  }, [user, firestore, allBankAccounts, toast]);

  
  const handleAddNew = React.useCallback(() => {
    setEditingIncome(null);
    setIsFormOpen(true);
  }, []);

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
          bankAccounts={allBankAccounts || []}
          user={user}
        />
      ) : (
        <IncomeList
          incomes={allIncomes || []}
          bankAccounts={allBankAccounts || []}
          users={allUsers || []}
        />
      )}
    </main>
  );
}
