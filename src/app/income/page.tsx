
'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import { IncomeList } from '@/components/income/income-list';
import { IncomeForm } from '@/components/income/income-form';
import type { Income, BankAccount, UserProfile, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase-client';

export default function IncomePage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData, error } = useDashboardData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { incomes: allIncomes, bankAccounts: allBankAccounts, users } = allData;

  const handleFormSubmit = useCallback(async (values: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'registeredByUserId' | 'type' | 'category'>) => {
    if (!user || !allBankAccounts || !users) return;
    
    setIsSubmitting(true);
    const isoDate = (values.date as Date).toISOString();
    const account = allBankAccounts.find(acc => acc.id === values.bankAccountId);
    if (!account) {
      toast({ variant: "destructive", title: "خطا", description: "کارت بانکی یافت نشد" });
      setIsSubmitting(false);
      return;
    }

    try {
      const balanceBefore = account.balance;
      const balanceAfter = balanceBefore + values.amount;

      // 1. Update bank account balance
      const { error: accountError } = await supabase
        .from('bank_accounts')
        .update({ balance: balanceAfter })
        .eq('id', account.id);

      if (accountError) throw accountError;

      // 2. Insert new income record
      const newIncomeData = {
          amount: values.amount,
          description: values.description,
          date: isoDate,
          owner_id: values.ownerId,
          bank_account_id: values.bankAccountId,
          source_text: values.source || values.description,
          category: 'درآمد', // As per schema
          registered_by_user_id: user.uid,
          // Supabase automatically handles created_at/updated_at
      };
      
      const { error: incomeError } = await supabase.from('incomes').insert([newIncomeData]);
      
      if (incomeError) {
        // Attempt to revert the balance change if income insertion fails
        await supabase.from('bank_accounts').update({ balance: balanceBefore }).eq('id', account.id);
        throw incomeError;
      }
      
      setIsFormOpen(false);
      toast({ title: "موفقیت", description: "درآمد جدید با موفقیت ثبت شد." });

      // 3. Send notification (non-critical)
      try {
          const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
          const bankAccountOwnerName = account?.ownerId === 'shared_account' ? 'مشترک' : (account?.ownerId && USER_DETAILS[account.ownerId as 'ali' | 'fatemeh']?.firstName);
          
           const notificationDetails: TransactionDetails = {
              type: 'income',
              title: `ثبت درآمد: ${values.description}`,
              amount: values.amount,
              date: isoDate,
              icon: 'TrendingUp',
              color: 'rgb(34 197 94)',
              registeredBy: currentUserFirstName,
              payee: values.source,
              category: values.ownerId === 'daramad_moshtarak' ? 'شغل مشترک' : `درآمد ${values.ownerId && USER_DETAILS[values.ownerId as 'ali' | 'fatemeh']?.firstName}`,
              bankAccount: account ? { name: account.bankName, owner: bankAccountOwnerName || 'نامشخص' } : undefined,
          };
          
          await sendSystemNotification(user.uid, notificationDetails);
      } catch (notificationError: any) {
           console.error("Failed to send notification:", notificationError.message);
      }
    } catch (error: any) {
        toast({
          variant: "destructive",
          title: "خطا در ثبت درآمد",
          description: error.message || "مشکلی در ثبت اطلاعات پیش آمد. لطفا دوباره تلاش کنید.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, allBankAccounts, users, toast]);

  const handleDelete = useCallback(async (incomeId: string) => {
    if (!allIncomes || !allBankAccounts) return;
    
    const incomeToDelete = allIncomes.find(inc => inc.id === incomeId);
    if (!incomeToDelete) {
        toast({ variant: "destructive", title: "خطا", description: "تراکنش درآمد مورد نظر یافت نشد." });
        return;
    }
    
    const account = allBankAccounts.find(acc => acc.id === incomeToDelete.bankAccountId);
    if (!account) {
        toast({ variant: "destructive", title: "خطا", description: "حساب بانکی مرتبط با این درآمد یافت نشد." });
        return;
    }

    try {
        const newBalance = account.balance - incomeToDelete.amount;

        // 1. Revert bank balance
        const { error: accountError } = await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', account.id);

        if (accountError) throw accountError;

        // 2. Delete the income record
        const { error: deleteError } = await supabase.from('incomes').delete().eq('id', incomeId);

        if (deleteError) {
            // Attempt to revert balance change
            await supabase.from('bank_accounts').update({ balance: account.balance }).eq('id', account.id);
            throw deleteError;
        }

        toast({ title: "موفقیت", description: "تراکنش درآمد با موفقیت حذف و مبلغ آن از حساب کسر شد." });

    } catch (error: any) {
        toast({
          variant: "destructive",
          title: "خطا در حذف درآمد",
          description: error.message || "مشکلی در حذف تراکنش پیش آمد.",
        });
    }
  }, [allIncomes, allBankAccounts, toast]);

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
            مدیریت درآمدها
          </h1>
        </div>
        <div className="hidden md:block">
            <Button onClick={handleAddNew} disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" />
                ثبت درآمد جدید
            </Button>
        </div>
      </div>

       <IncomeForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={null}
          bankAccounts={allBankAccounts || []}
          user={user}
        />

      {isLoading ? (
          <div className="space-y-4 mt-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
          </div>
      ) : (
        <IncomeList
          incomes={allIncomes || []}
          bankAccounts={allBankAccounts || []}
          users={users || []}
          onDelete={handleDelete}
        />
      )}

      <div className="md:hidden fixed bottom-20 right-4 z-50">
          <Button
            onClick={handleAddNew}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            aria-label="ثبت درآمد جدید"
            disabled={isSubmitting}
          >
            <Plus className="h-6 w-6" />
          </Button>
      </div>
    </div>
  );
}
