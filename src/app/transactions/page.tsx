
'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { ExpenseList } from '@/components/transactions/expense-list';
import { ExpenseForm } from '@/components/transactions/expense-form';
import type { Expense, BankAccount, Category, UserProfile, TransactionDetails, Payee } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';

// Define a more specific type for the form values we expect
type ExpenseSubmissionValues = Omit<Expense, 'id' | 'createdAt' | 'type' | 'ownerId' | 'registeredByUserId'> & { attachment_path?: string };

export default function ExpensesPage() {
  const { user, isLoading: isUserLoading } = useAuth();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData, refreshData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    expenses: allExpenses,
    bankAccounts: allBankAccounts,
    categories: allCategories,
    payees: allPayees,
    users,
  } = allData;

  // 1. Update the function signature to accept the new values type
  const handleFormSubmit = useCallback(async (values: ExpenseSubmissionValues) => {
    if (!user || !allBankAccounts || !users || !allCategories || !allPayees) {
        toast({ variant: "destructive", title: "خطا", description: "سرویس‌های مورد نیاز بارگذاری نشده‌اند." });
        return;
    }
    setIsSubmitting(true);
    
    const account = allBankAccounts.find(acc => acc.id === values.bankAccountId);
    if (!account) {
        toast({ variant: "destructive", title: "خطا", description: "کارت بانکی یافت نشد." });
        setIsSubmitting(false);
        return;
    }

    const availableBalance = account.balance - (account.blockedBalance || 0);
    if (availableBalance < values.amount) {
        toast({ variant: "destructive", title: "خطای موجودی", description: "موجودی قابل استفاده حساب برای انجام این هزینه کافی نیست." });
        setIsSubmitting(false);
        return;
    }

    try {
        const balanceBefore = account.balance;
        const balanceAfter = balanceBefore - values.amount;

        // 1. Update bank account balance
        const { error: accountError } = await supabase
            .from('bank_accounts')
            .update({ balance: balanceAfter })
            .eq('id', account.id);

        if (accountError) throw accountError;

        // 2. Insert new expense record, now with attachment_path
        const newExpenseData = {
            description: values.description,
            amount: values.amount,
            date: (values.date as any).toISOString(),
            bank_account_id: values.bankAccountId,
            category_id: values.categoryId,
            payee_id: values.payeeId === 'none' ? null : values.payeeId,
            expense_for: values.expenseFor,
            owner_id: account.ownerId,
            registered_by_user_id: user.uid,
            attachment_path: values.attachment_path, // <<< THE MAGIC HAPPENS HERE
        };

        const { error: expenseError } = await supabase.from('expenses').insert([newExpenseData]);

        if (expenseError) {
            // Attempt to revert balance change
            await supabase.from('bank_accounts').update({ balance: balanceBefore }).eq('id', account.id);
            throw expenseError;
        }
        
        await refreshData();
        setIsFormOpen(false);
        toast({ title: "موفقیت", description: "هزینه جدید با موفقیت ثبت شد." });

        // 3. Send notification (non-critical)
        try {
            const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
            const category = allCategories.find(c => c.id === values.categoryId);
            const payee = allPayees.find(p => p.id === values.payeeId);
            const bankAccountOwnerName = account?.ownerId === 'shared_account' ? 'مشترک' : (account?.ownerId && USER_DETAILS[account.ownerId as 'ali' | 'fatemeh']?.firstName);
            const expenseDate = values.date instanceof Date ? values.date.toISOString() : new Date().toISOString();

            const notificationDetails: TransactionDetails = {
                type: 'expense',
                title: values.description,
                amount: values.amount,
                date: expenseDate,
                icon: 'TrendingDown',
                color: 'rgb(220 38 38)',
                registeredBy: currentUserFirstName,
                category: category?.name,
                payee: payee?.name,
                bankAccount: account ? { name: account.bankName, owner: bankAccountOwnerName || 'نامشخص' } : undefined,
                expenseFor: (values.expenseFor && USER_DETAILS[values.expenseFor as 'ali' | 'fatemeh']?.firstName) || 'مشترک',
            };
            
            await sendSystemNotification(user.uid, notificationDetails);
        } catch (notificationError: any) {
            console.error("Failed to send notification:", notificationError.message);
        }

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در ثبت هزینه",
            description: error.message || "مشکلی در ثبت اطلاعات پیش آمد. لطفا دوباره تلاش کنید.",
        });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, allBankAccounts, allCategories, allPayees, users, toast, refreshData]);

   const handleDelete = useCallback(async (expense: Expense) => {
    if (!allExpenses || !allBankAccounts) return;
    
    const expenseToDelete = allExpenses.find(exp => exp.id === expense.id);
    if (!expenseToDelete) {
        toast({ variant: "destructive", title: "خطا", description: "تراکنش هزینه مورد نظر یافت نشد." });
        return;
    }
    
    const account = allBankAccounts.find(acc => acc.id === expenseToDelete.bankAccountId);
    if (!account) {
        toast({ variant: "destructive", title: "خطا", description: "حساب بانکی مرتبط یافت نشد." });
        return;
    }

    try {
        if (expense.attachment_path) {
            const { error: storageError } = await supabase.storage.from('hesabketabsatl').remove([expense.attachment_path]);
            if (storageError) {
                console.warn(`Failed to delete attachment ${expense.attachment_path}:`, storageError.message);
            }
        }

        const newBalance = account.balance + expenseToDelete.amount;

        const { error: accountError } = await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', account.id);

        if (accountError) throw accountError;

        const { error: deleteError } = await supabase.from('expenses').delete().eq('id', expense.id);

        if (deleteError) {
            await supabase.from('bank_accounts').update({ balance: account.balance }).eq('id', account.id);
            throw deleteError;
        }
        
        await refreshData();
        toast({ title: "موفقیت", description: "تراکنش هزینه با موفقیت حذف و مبلغ به حساب بازگردانده شد." });

    } catch (error: any) {
        toast({
          variant: "destructive",
          title: "خطا در حذف هزینه",
          description: error.message || "مشکلی در حذف تراکنش پیش آمد.",
        });
    }
  }, [allExpenses, allBankAccounts, toast, refreshData]);

  
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
                <Button onClick={handleAddNew} data-testid="add-new-expense-desktop" disabled={isSubmitting}>
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
            isSubmitting={isSubmitting}
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
                disabled={isSubmitting}
              >
                <Plus className="h-6 w-6" />
              </Button>
          </div>
      )}
    </div>
  );
}
