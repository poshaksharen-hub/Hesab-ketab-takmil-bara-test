
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { ExpenseList } from '@/components/transactions/expense-list';
import { ExpenseForm } from '@/components/transactions/expense-form';
import type { Expense, BankAccount, Category, UserProfile, OwnerId, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';

const FAMILY_DATA_DOC = 'shared-data';

export default function ExpensesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const {
    expenses: allExpenses,
    bankAccounts: allBankAccounts,
    categories: allCategories,
    payees: allPayees,
    users: allUsers,
  } = allData;

  const handleFormSubmit = React.useCallback(async (values: Omit<Expense, 'id' | 'createdAt' | 'type' | 'registeredByUserId' | 'ownerId'>) => {
    if (!user || !firestore || !allBankAccounts) return;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            
            const account = allBankAccounts.find(acc => acc.id === values.bankAccountId);
            if (!account) throw new Error("کارت بانکی یافت نشد");
            
            const fromCardRef = doc(familyDataRef, 'bankAccounts', account.id);
            const fromCardDoc = await transaction.get(fromCardRef);

            if (!fromCardDoc.exists()) {
                throw new Error("کارت بانکی مورد نظر یافت نشد.");
            }
            const fromCardData = fromCardDoc.data() as BankAccount;
            const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);
            
            if (availableBalance < values.amount) {
                throw new Error("موجودی قابل استفاده حساب برای انجام این هزینه کافی نیست.");
            }
            
            const balanceBefore = fromCardData.balance;
            const balanceAfter = balanceBefore - values.amount;
            
            transaction.update(fromCardRef, { balance: balanceAfter });

            const newExpenseRef = doc(collection(familyDataRef, 'expenses'));
            
            const newExpenseData: Omit<Expense, 'id' | 'createdAt' | 'type' | 'registeredByUserId'> = {
                ...values,
                ownerId: account.ownerId,
                registeredByUserId: user.uid,
                balanceBefore,
                balanceAfter,
            };

            transaction.set(newExpenseRef, {
                ...newExpenseData,
                id: newExpenseRef.id,
                type: 'expense',
                createdAt: serverTimestamp(),
            });
        });
        
        toast({ title: "موفقیت", description: "هزینه جدید با موفقیت ثبت شد." });
        setIsFormOpen(false);
        
        const categoryName = allCategories.find(c => c.id === values.categoryId)?.name;
        const payeeName = allPayees.find(p => p.id === values.payeeId)?.name;
        const bankAccount = allBankAccounts.find(b => b.id === values.bankAccountId);
        
        const notificationDetails: TransactionDetails = {
            type: 'expense',
            title: `ثبت هزینه: ${values.description}`,
            amount: values.amount,
            date: values.date,
            icon: 'TrendingDown',
            color: 'rgb(220 38 38)',
            properties: [
                { label: 'دسته بندی', value: categoryName },
                { label: 'طرف حساب', value: payeeName },
                { label: 'از حساب', value: bankAccount?.bankName },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);


    } catch (error: any) {
        if (error.name === 'FirebaseError') {
          throw new FirestorePermissionError({
                path: 'family-data/shared-data/expenses',
                operation: 'create',
                requestResourceData: values,
            });
        } else {
          toast({
            variant: "destructive",
            title: "خطا در ثبت تراکنش",
            description: error.message || "مشکلی در ثبت هزینه پیش آمد.",
          });
        }
    }
  }, [user, firestore, allBankAccounts, allCategories, allPayees, toast]);

   const handleDelete = React.useCallback(async (expenseId: string) => {
    if (!firestore || !allExpenses) return;
    
    const expenseToDelete = allExpenses.find(exp => exp.id === expenseId);
    if (!expenseToDelete) {
        toast({ variant: "destructive", title: "خطا", description: "تراکنش هزینه مورد نظر یافت نشد." });
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const expenseRef = doc(familyDataRef, 'expenses', expenseId);
            const accountRef = doc(familyDataRef, 'bankAccounts', expenseToDelete.bankAccountId);

            const accountDoc = await transaction.get(accountRef);
            if (!accountDoc.exists()) throw new Error("حساب بانکی مرتبط با این هزینه یافت نشد.");

            const accountData = accountDoc.data()!;
            transaction.update(accountRef, { balance: accountData.balance + expenseToDelete.amount });

            transaction.delete(expenseRef);
        });
        toast({ title: "موفقیت", description: "تراکنش هزینه با موفقیت حذف و مبلغ آن به حساب بازگردانده شد." });
    } catch (error: any) {
         if (error.name === 'FirebaseError') {
             throw new FirestorePermissionError({
                path: `family-data/shared-data/expenses/${expenseId}`,
                operation: 'delete',
            });
        } else {
          toast({
            variant: "destructive",
            title: "خطا در حذف هزینه",
            description: error.message || "مشکلی در حذف تراکنش پیش آمد.",
          });
        }
    }
  }, [firestore, allExpenses, toast]);

  
  const handleAddNew = React.useCallback(() => {
    setIsFormOpen(true);
  }, []);
  
  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مدیریت هزینه‌ها
        </h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          ثبت هزینه جدید
        </Button>
      </div>

       <ExpenseForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={null}
          bankAccounts={allBankAccounts || []}
          categories={allCategories || []}
          payees={allPayees || []}
        />

      {isLoading ? (
          <div className="space-y-4 mt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : (
        <ExpenseList
          expenses={allExpenses || []}
          bankAccounts={allBankAccounts || []}
          categories={allCategories || []}
          users={allUsers || []}
          payees={allPayees || []}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
