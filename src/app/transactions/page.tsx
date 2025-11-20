
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
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
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);

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
            const expenseData = { ...values };
            
            const account = allBankAccounts.find(acc => acc.id === expenseData.bankAccountId);
            if (!account) throw new Error("کارت بانکی یافت نشد");
            
            const ownerId: OwnerId = account.ownerId;
            const fromCardRef = doc(firestore, `family-data/${FAMILY_DATA_DOC}/bankAccounts`, account.id);
            const fromCardDoc = await transaction.get(fromCardRef);

            if (!fromCardDoc.exists()) {
                throw new Error("کارت بانکی مورد نظر یافت نشد.");
            }
            const fromCardData = fromCardDoc.data() as BankAccount;
            const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);
            
            if (availableBalance < expenseData.amount) {
                throw new Error("موجودی حساب برای انجام این هزینه کافی نیست.");
            }
            
            // 1. Deduct from balance
            transaction.update(fromCardRef, { balance: fromCardData.balance - expenseData.amount });

            // 2. Create new expense document
            const expensesColRef = collection(firestore, `family-data/${FAMILY_DATA_DOC}/expenses`);
            const newExpenseRef = doc(expensesColRef);
            
            transaction.set(newExpenseRef, {
                ...expenseData,
                id: newExpenseRef.id,
                ownerId: ownerId, // Set the ownerId based on the bank account's owner
                type: 'expense',
                registeredByUserId: user.uid,
                createdAt: serverTimestamp(),
            });

            toast({ title: "موفقیت", description: "هزینه جدید با موفقیت ثبت شد." });
        });
        
        setIsFormOpen(false);
        setEditingExpense(null);

    } catch (error: any) {
        if (error instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', error);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در ثبت تراکنش",
            description: error.message || "مشکلی در ثبت هزینه پیش آمد.",
          });
        }
    }
  }, [user, firestore, allBankAccounts, toast]);

  const handleDelete = React.useCallback(async (expense: Expense) => {
    // Deleting is disabled per user request
    return;
  }, []);

  const handleEdit = React.useCallback((expense: Expense) => {
    // Per user request, editing is disabled.
    return;
  }, []);
  
  const handleAddNew = React.useCallback(() => {
    setEditingExpense(null);
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
          initialData={editingExpense}
          bankAccounts={allBankAccounts || []}
          categories={allCategories || []}
          payees={allPayees || []}
          user={user}
        />
      ) : (
        <ExpenseList
          expenses={allExpenses || []}
          bankAccounts={allBankAccounts || []}
          categories={allCategories || []}
          users={allUsers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
