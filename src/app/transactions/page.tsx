
'use client';

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { ExpenseList } from '@/components/transactions/expense-list';
import { ExpenseForm } from '@/components/transactions/expense-form';
import type { Expense, BankAccount, Category, UserProfile, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { errorEmitter } from '@/firebase/error-emitter';

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
    users,
  } = allData;

  const handleFormSubmit = useCallback(async (values: Omit<Expense, 'id' | 'createdAt' | 'type' | 'ownerId' | 'registeredByUserId'>) => {
    if (!user || !firestore || !allBankAccounts || !users || !allCategories || !allPayees) return;
    const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
    
    runTransaction(firestore, async (transaction) => {
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
        
        const newExpenseData = {
            ...values,
            date: (values.date as any).toISOString(),
            id: newExpenseRef.id,
            ownerId: account.ownerId,
            registeredByUserId: user.uid, // Set registrar here
            balanceBefore,
            balanceAfter,
            type: 'expense' as const,
            createdAt: serverTimestamp(),
        };

        transaction.set(newExpenseRef, newExpenseData);
    }).then(async () => {
        setIsFormOpen(false);
        toast({ title: "موفقیت", description: "هزینه جدید با موفقیت ثبت شد." });
        
        try {
            const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
            const category = allCategories.find(c => c.id === values.categoryId);
            const payee = allPayees.find(p => p.id === values.payeeId);
            const bankAccount = allBankAccounts.find(b => b.id === values.bankAccountId);
            const bankAccountOwnerName = bankAccount?.ownerId === 'shared_account' ? 'مشترک' : (bankAccount?.ownerId && USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh']?.firstName);

            const notificationDetails: TransactionDetails = {
                type: 'expense',
                title: values.description,
                amount: values.amount,
                date: (values.date as any).toISOString(),
                icon: 'TrendingDown',
                color: 'rgb(220 38 38)',
                registeredBy: currentUserFirstName,
                category: category?.name,
                payee: payee?.name,
                bankAccount: bankAccount ? { name: bankAccount.bankName, owner: bankAccountOwnerName || 'نامشخص' } : undefined,
                expenseFor: (values.expenseFor && USER_DETAILS[values.expenseFor as 'ali' | 'fatemeh']?.firstName) || 'مشترک',
            };
            
            await sendSystemNotification(firestore, user.uid, notificationDetails);
        } catch (notificationError: any) {
            console.error("Failed to send notification:", notificationError.message);
            toast({
                variant: "destructive",
                title: "خطا در ارسال نوتیفیکیشن",
                description: "هزینه ثبت شد اما در ارسال پیام آن به گفتگو مشکلی پیش آمد.",
            });
        }

    }).catch((error: any) => {
        if (error.name === 'FirebaseError') {
          const permissionError = new FirestorePermissionError({
                path: 'family-data/shared-data/expenses',
                operation: 'create',
            });
          errorEmitter.emit("permission-error", permissionError);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در ثبت تراکنش",
            description: error.message || "مشکلی در ثبت هزینه پیش آمد.",
          });
        }
    });
  }, [user, firestore, allBankAccounts, allCategories, allPayees, users, toast]);

   const handleDelete = useCallback(async (expenseId: string) => {
    if (!firestore || !allExpenses) return;
    
    const expenseToDelete = allExpenses.find(exp => exp.id === expenseId);
    if (!expenseToDelete) {
        toast({ variant: "destructive", title: "خطا", description: "تراکنش هزینه مورد نظر یافت نشد." });
        return;
    }
    const expenseRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'expenses', expenseId);

    runTransaction(firestore, async (transaction) => {
        const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
        const accountRef = doc(familyDataRef, 'bankAccounts', expenseToDelete.bankAccountId);

        const accountDoc = await transaction.get(accountRef);
        if (!accountDoc.exists()) throw new Error("حساب بانکی مرتبط با این هزینه یافت نشد.");

        const accountData = accountDoc.data()!;
        transaction.update(accountRef, { balance: accountData.balance + expenseToDelete.amount });

        transaction.delete(expenseRef);
    }).then(() => {
        toast({ title: "موفقیت", description: "تراکنش هزینه با موفقیت حذف و مبلغ آن به حساب بازگردانده شد." });
    }).catch((error: any) => {
         if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({
                path: expenseRef.path,
                operation: 'delete',
            });
            errorEmitter.emit("permission-error", permissionError);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در حذف هزینه",
            description: error.message || "مشکلی در حذف تراکنش پیش آمد.",
          });
        }
    });
  }, [firestore, allExpenses, toast]);

  
  const handleAddNew = useCallback(() => {
    setIsFormOpen(true);
  }, []);
  
  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" passHref>
            <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            مدیریت هزینه‌ها
          </h1>
        </div>
        {!isFormOpen && (
            <div className="hidden md:block">
                <Button onClick={handleAddNew} data-testid="add-new-expense-desktop">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    ثبت هزینه جدید
                </Button>
            </div>
        )}
      </div>

       <ExpenseForm
            isOpen={isFormOpen}
            setIsOpen={setIsFormOpen}
            onSubmit={handleFormSubmit}
            initialData={null}
            bankAccounts={allBankAccounts || []}
            categories={allCategories || []}
            payees={allPayees || []}
            user={user}
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
          payees={allPayees || []}
          users={users || []}
          onDelete={handleDelete}
        />
      )}
      
      {!isFormOpen && (
          <div className="md:hidden fixed bottom-20 right-4 z-50">
              <Button
                onClick={handleAddNew}
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg"
                aria-label="ثبت هزینه جدید"
              >
                <Plus className="h-6 w-6" />
              </Button>
          </div>
      )}
    </div>
  );
}
