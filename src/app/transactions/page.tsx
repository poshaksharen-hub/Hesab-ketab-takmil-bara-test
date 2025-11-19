'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ExpenseList } from '@/components/transactions/expense-list';
import { ExpenseForm } from '@/components/transactions/expense-form';
import type { Expense, BankAccount, Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function ExpensesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);

  const expensesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'expenses') : null),
    [firestore, user]
  );
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

  const bankAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'bankAccounts') : null),
    [firestore, user]
  );
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
  
  const categoriesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'categories') : null),
    [firestore, user]
  );
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

  const handleFormSubmit = async (values: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'type'>) => {
    if (!user || !firestore) return;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const expenseData = { ...values, type: 'expense' as 'expense' };
            const fromCardRef = doc(firestore, 'users', user.uid, 'bankAccounts', expenseData.bankAccountId);
            const fromCardDoc = await transaction.get(fromCardRef);

            if (!fromCardDoc.exists()) {
                throw new Error("کارت بانکی مورد نظر یافت نشد.");
            }
            const fromCardData = fromCardDoc.data() as BankAccount;

            if (editingExpense) {
                // --- Edit Mode ---
                const oldExpenseRef = doc(firestore, 'users', user.uid, 'expenses', editingExpense.id);
                const oldCardRef = doc(firestore, 'users', user.uid, 'bankAccounts', editingExpense.bankAccountId);
                
                // 1. Revert previous transaction
                if (editingExpense.bankAccountId === expenseData.bankAccountId) {
                    // Card is the same, just adjust balance
                    const adjustedBalance = fromCardData.balance + editingExpense.amount - expenseData.amount;
                    if (adjustedBalance < 0) {
                        throw new Error("موجودی حساب کافی نیست.");
                    }
                    transaction.update(fromCardRef, { balance: adjustedBalance });
                } else {
                    // Card has changed, revert old and apply new
                    const oldCardDoc = await transaction.get(oldCardRef);
                    if (oldCardDoc.exists()) {
                        const oldCardData = oldCardDoc.data() as BankAccount;
                        transaction.update(oldCardRef, { balance: oldCardData.balance + editingExpense.amount });
                    }
                    if (fromCardData.balance < expenseData.amount) {
                         throw new Error("موجودی حساب جدید کافی نیست.");
                    }
                    transaction.update(fromCardRef, { balance: fromCardData.balance - expenseData.amount });
                }

                // 2. Update expense document
                transaction.update(oldExpenseRef, { ...expenseData, updatedAt: serverTimestamp() });
                toast({ title: "موفقیت", description: "هزینه با موفقیت ویرایش شد." });

            } else {
                // --- Create Mode ---
                if (fromCardData.balance < expenseData.amount) {
                    throw new Error("موجودی حساب برای انجام این هزینه کافی نیست.");
                }
                // 1. Deduct from balance
                transaction.update(fromCardRef, { balance: fromCardData.balance - expenseData.amount });

                // 2. Create new expense document
                const newExpenseRef = doc(collection(firestore, 'users', user.uid, 'expenses'));
                transaction.set(newExpenseRef, {
                    ...expenseData,
                    id: newExpenseRef.id,
                    userId: user.uid,
                    createdAt: serverTimestamp(),
                });
                toast({ title: "موفقیت", description: "هزینه جدید با موفقیت ثبت شد." });
            }
        });
        
        setIsFormOpen(false);
        setEditingExpense(null);

    } catch (error: any) {
        console.error("Transaction Error: ", error);
        toast({
            variant: "destructive",
            title: "خطا در ثبت تراکنش",
            description: error.message || "مشکلی در ثبت هزینه پیش آمد.",
        });
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!user || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const expenseRef = doc(firestore, 'users', user.uid, 'expenses', expense.id);
            const cardRef = doc(firestore, 'users', user.uid, 'bankAccounts', expense.bankAccountId);

            const cardDoc = await transaction.get(cardRef);
            if (cardDoc.exists()) {
                const cardData = cardDoc.data() as BankAccount;
                transaction.update(cardRef, { balance: cardData.balance + expense.amount });
            }
            
            transaction.delete(expenseRef);
        });
        toast({ title: "موفقیت", description: "هزینه با موفقیت حذف شد." });
    } catch (error: any) {
        console.error("Delete Error:", error);
        toast({
            variant: "destructive",
            title: "خطا در حذف هزینه",
            description: error.message || "مشکلی در حذف هزینه پیش آمد.",
        });
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };
  
  const isLoading = isUserLoading || isLoadingExpenses || isLoadingBankAccounts || isLoadingCategories;

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
          bankAccounts={bankAccounts || []}
          categories={categories || []}
        />
      ) : (
        <ExpenseList
          expenses={expenses || []}
          bankAccounts={bankAccounts || []}
          categories={categories || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
