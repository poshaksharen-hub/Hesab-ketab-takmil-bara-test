
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ExpenseList } from '@/components/transactions/expense-list';
import { ExpenseForm } from '@/components/transactions/expense-form';
import type { Expense, BankAccount, Category, UserProfile, OwnerId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { USER_DETAILS } from '@/lib/constants';

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

  const handleFormSubmit = React.useCallback(async (values: Omit<Expense, 'id' | 'createdAt' | 'type' | 'registeredByUserId'>) => {
    if (!user || !firestore || !allBankAccounts) return;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const expenseData = { ...values };
            
            const account = allBankAccounts.find(acc => acc.id === expenseData.bankAccountId);
            if (!account) throw new Error("کارت بانکی یافت نشد");
            
            const ownerId: OwnerId = account.ownerId;
            const fromCardRef = doc(familyDataRef, 'bankAccounts', account.id);
            const fromCardDoc = await transaction.get(fromCardRef);

            if (!fromCardDoc.exists()) {
                throw new Error("کارت بانکی مورد نظر یافت نشد.");
            }
            const fromCardData = fromCardDoc.data() as BankAccount;
            const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);
            
            if (availableBalance < expenseData.amount) {
                throw new Error("موجودی حساب برای انجام این هزینه کافی نیست.");
            }
            
            const balanceBefore = fromCardData.balance;
            const balanceAfter = balanceBefore - expenseData.amount;
            
            // 1. Deduct from balance
            transaction.update(fromCardRef, { balance: balanceAfter });

            // 2. Create new expense document
            const newExpenseRef = doc(collection(familyDataRef, 'expenses'));
            
            transaction.set(newExpenseRef, {
                ...expenseData,
                id: newExpenseRef.id,
                ownerId: ownerId, // Set the ownerId based on the bank account's owner
                type: 'expense',
                registeredByUserId: user.uid,
                createdAt: serverTimestamp(),
                balanceBefore,
                balanceAfter,
            });
        });
        
        toast({ title: "موفقیت", description: "هزینه جدید با موفقیت ثبت شد." });
        setIsFormOpen(false);

    } catch (error: any) {
        if (error.name === 'FirebaseError') {
          const permissionError = new FirestorePermissionError({
                path: 'family-data/shared-data/expenses',
                operation: 'create',
                requestResourceData: values,
            });
          errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در ثبت تراکنش",
            description: error.message || "مشکلی در ثبت هزینه پیش آمد.",
          });
        }
    }
  }, [user, firestore, allBankAccounts, toast]);

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

            // Reverse the transaction
            const accountData = accountDoc.data() as BankAccount;
            transaction.update(accountRef, { balance: accountData.balance + expenseToDelete.amount });

            // Delete the expense document
            transaction.delete(expenseRef);
        });
        toast({ title: "موفقیت", description: "تراکنش هزینه با موفقیت حذف و مبلغ آن به حساب بازگردانده شد." });
    } catch (error: any) {
         if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({
                path: `family-data/shared-data/expenses/${expenseId}`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
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

      {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : isFormOpen ? (
        <ExpenseForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={null}
          bankAccounts={allBankAccounts || []}
          categories={allCategories || []}
          payees={allPayees || []}
        />
      ) : (
        <ExpenseList
          expenses={allExpenses || []}
          bankAccounts={allBankAccounts || []}
          categories={allCategories || []}
          users={allUsers || []}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
