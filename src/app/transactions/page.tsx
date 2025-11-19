'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ExpenseList } from '@/components/transactions/expense-list';
import { ExpenseForm } from '@/components/transactions/expense-form';
import type { Expense, BankAccount, Category, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';

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
    users: allUsers,
  } = allData;

  const handleFormSubmit = async (values: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'type' | 'registeredByUserId'>) => {
    if (!user || !firestore) return;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const expenseData = { ...values, type: 'expense' as 'expense' };
            
            const account = allBankAccounts.find(acc => acc.id === expenseData.bankAccountId);
            if (!account) throw new Error("کارت بانکی یافت نشد");
            const isSharedAccount = !!account.isShared;

            const fromCardRef = doc(firestore, isSharedAccount ? `shared/data/bankAccounts/${account.id}` : `users/${account.userId}/bankAccounts/${account.id}`);
            const fromCardDoc = await transaction.get(fromCardRef);

            if (!fromCardDoc.exists()) {
                throw new Error("کارت بانکی مورد نظر یافت نشد.");
            }
            const fromCardData = fromCardDoc.data() as BankAccount;

            if (editingExpense) {
                // --- Edit Mode ---
                const oldExpenseRef = doc(firestore, 'users', editingExpense.userId, 'expenses', editingExpense.id);
                
                const oldAccount = allBankAccounts.find(acc => acc.id === editingExpense.bankAccountId);
                if(!oldAccount) throw new Error("کارت بانکی قدیمی یافت نشد.");
                const isOldShared = !!oldAccount.isShared;
                
                const oldCardRef = doc(firestore, isOldShared ? `shared/data/bankAccounts/${oldAccount.id}` : `users/${oldAccount.userId}/bankAccounts/${oldAccount.id}`);

                // 1. Revert previous transaction
                if (editingExpense.bankAccountId === expenseData.bankAccountId) {
                    // Card is the same, just adjust balance
                    const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);
                    if (availableBalance + editingExpense.amount < expenseData.amount) {
                        throw new Error("موجودی حساب کافی نیست.");
                    }
                    const adjustedBalance = fromCardData.balance + editingExpense.amount - expenseData.amount;
                    transaction.update(fromCardRef, { balance: adjustedBalance });
                } else {
                    // Card has changed, revert old and apply new
                    const oldCardDoc = await transaction.get(oldCardRef);
                    if (oldCardDoc.exists()) {
                        const oldCardData = oldCardDoc.data() as BankAccount;
                        transaction.update(oldCardRef, { balance: oldCardData.balance + editingExpense.amount });
                    }
                    const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);
                    if (availableBalance < expenseData.amount) {
                         throw new Error("موجودی حساب جدید کافی نیست.");
                    }
                    transaction.update(fromCardRef, { balance: fromCardData.balance - expenseData.amount });
                }

                // 2. Update expense document
                transaction.update(oldExpenseRef, { ...expenseData, registeredByUserId: user.uid, updatedAt: serverTimestamp() });
                toast({ title: "موفقیت", description: "هزینه با موفقیت ویرایش شد." });

            } else {
                // --- Create Mode ---
                const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);
                if (availableBalance < expenseData.amount) {
                    throw new Error("موجودی حساب برای انجام این هزینه کافی نیست.");
                }
                // 1. Deduct from balance
                transaction.update(fromCardRef, { balance: fromCardData.balance - expenseData.amount });

                // 2. Create new expense document in the account owner's collection
                const expenseOwnerId = account.userId;
                const newExpenseRef = doc(collection(firestore, 'users', expenseOwnerId, 'expenses'));
                transaction.set(newExpenseRef, {
                    ...expenseData,
                    id: newExpenseRef.id,
                    userId: expenseOwnerId,
                    registeredByUserId: user.uid,
                    createdAt: serverTimestamp(),
                });
                toast({ title: "موفقیت", description: "هزینه جدید با موفقیت ثبت شد." });
            }
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
  };

  const handleDelete = async (expense: Expense) => {
    if (!user || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const expenseRef = doc(firestore, 'users', expense.userId, 'expenses', expense.id);
            
            const account = allBankAccounts.find(acc => acc.id === expense.bankAccountId);
            if(!account) throw new Error("کارت بانکی یافت نشد");
            const isShared = !!account.isShared;
            
            const cardRef = doc(firestore, isShared ? `shared/data/bankAccounts/${account.id}` : `users/${account.userId}/bankAccounts/${account.id}`);

            const cardDoc = await transaction.get(cardRef);
            if (cardDoc.exists()) {
                const cardData = cardDoc.data() as BankAccount;
                transaction.update(cardRef, { balance: cardData.balance + expense.amount });
            }
            
            transaction.delete(expenseRef);
        });
        toast({ title: "موفقیت", description: "هزینه با موفقیت حذف شد." });
    } catch (error: any) {
       if (error instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', error);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در حذف هزینه",
            description: error.message || "مشکلی در حذف هزینه پیش آمد.",
          });
        }
    }
  };

  const handleEdit = (expense: Expense) => {
    if (expense.checkId || expense.loanPaymentId) {
        toast({
            variant: "destructive",
            title: "امکان ویرایش وجود ندارد",
            description: "این هزینه به صورت خودکار (بابت چک یا قسط وام) ثبت شده و قابل ویرایش نیست.",
        });
        return;
    }
    setEditingExpense(expense);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };
  
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
