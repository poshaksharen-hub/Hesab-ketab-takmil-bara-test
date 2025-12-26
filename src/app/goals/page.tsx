
'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import type { FinancialGoal, BankAccount, Category, TransactionDetails, Expense, UserProfile, OwnerId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GoalList } from '@/components/goals/goal-list';
import { GoalForm } from '@/components/goals/goal-form';
import { AchieveGoalDialog } from '@/components/goals/achieve-goal-dialog';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { AddToGoalDialog } from '@/components/goals/add-to-goal-dialog';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { USER_DETAILS } from '@/lib/constants';
import { supabase } from '@/lib/supabase-client';


export default function GoalsPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [achievingGoal, setAchievingGoal] = useState<FinancialGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<FinancialGoal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const { goals, bankAccounts, categories, users } = allData;

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !users || !bankAccounts) return;
    setIsSubmitting(true);
    const { initialContributionAmount = 0, initialContributionBankAccountId, ...goalData } = values;

    try {
        const { data: newGoal, error: goalError } = await supabase
            .from('financial_goals')
            .insert({
                name: goalData.name,
                target_amount: goalData.targetAmount,
                target_date: goalData.targetDate.toISOString(),
                priority: goalData.priority,
                owner_id: goalData.ownerId,
                registered_by_user_id: user.uid,
                is_achieved: false,
                current_amount: 0,
            })
            .select()
            .single();

        if (goalError) throw goalError;

        let finalCurrentAmount = 0;

        if (initialContributionBankAccountId && initialContributionAmount > 0) {
            const account = bankAccounts.find(acc => acc.id === initialContributionBankAccountId);
            if (!account) throw new Error("حساب بانکی انتخاب شده برای پس‌انداز یافت نشد.");

            const availableBalance = account.balance - (account.blockedBalance || 0);
            if (availableBalance < initialContributionAmount) {
                throw new Error("موجودی قابل استفاده حساب برای این مبلغ کافی نیست.");
            }
            
            const contributionDate = new Date().toISOString();
            const balanceBefore = account.balance;
            const balanceAfter = balanceBefore - initialContributionAmount;

            const expenseCategory = categories.find(c => c.name.includes('پس‌انداز')) || categories[0];

            const { error: expenseError } = await supabase.from('expenses').insert({
                owner_id: account.ownerId,
                registered_by_user_id: user.uid,
                amount: initialContributionAmount,
                bank_account_id: initialContributionBankAccountId,
                category_id: expenseCategory?.id || 'uncategorized',
                date: contributionDate,
                description: `پس انداز اولیه برای هدف: ${goalData.name}`,
                type: 'expense',
                sub_type: 'goal_contribution',
                goal_id: newGoal.id,
                expense_for: goalData.ownerId,
            });

            if (expenseError) throw expenseError;
            
            const newBlockedBalance = (account.blockedBalance || 0) + initialContributionAmount;
            const { error: accountUpdateError } = await supabase
                .from('bank_accounts')
                .update({ balance: balanceAfter, blocked_balance: newBlockedBalance })
                .eq('id', initialContributionBankAccountId);
            
            if (accountUpdateError) throw accountUpdateError;

            finalCurrentAmount = initialContributionAmount;

             const { error: goalUpdateError } = await supabase
                .from('financial_goals')
                .update({ current_amount: finalCurrentAmount })
                .eq('id', newGoal.id);

            if(goalUpdateError) throw goalUpdateError;
        }

        toast({ title: 'موفقیت', description: `هدف مالی جدید با موفقیت ذخیره شد.` });
        setIsFormOpen(false);
        
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const notificationDetails: TransactionDetails = {
            type: 'goal',
            title: `هدف جدید: ${goalData.name}`,
            amount: goalData.targetAmount,
            date: goalData.targetDate.toISOString(),
            icon: 'Target',
            color: 'rgb(20 184 166)',
            registeredBy: currentUserFirstName,
            expenseFor: (goalData.ownerId && USER_DETAILS[goalData.ownerId as 'ali' | 'fatemeh']?.firstName) || 'مشترک',
            properties: [
                { label: 'اولویت', value: goalData.priority === 'high' ? 'بالا' : goalData.priority === 'medium' ? 'متوسط' : 'پایین' },
                { label: 'پس‌انداز اولیه', value: finalCurrentAmount > 0 ? formatCurrency(finalCurrentAmount, 'IRT') : 'ندارد' }
            ]
        };
        await sendSystemNotification(user.uid, notificationDetails);

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'خطا در ثبت هدف',
            description: error.message || 'مشکلی در ثبت اطلاعات پیش آمد.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, toast, bankAccounts, users, categories]);

  const handleAddToGoal = useCallback(async ({ goal, amount, bankAccountId }: { goal: FinancialGoal, amount: number, bankAccountId: string }) => {
     if (!user || !users || !categories || !bankAccounts) return;
     setIsSubmitting(true);

     try {
        const account = bankAccounts.find(acc => acc.id === bankAccountId);
        if (!account) throw new Error("حساب بانکی انتخاب شده یافت نشد.");

        const availableBalance = account.balance - (account.blockedBalance || 0);
        if (availableBalance < amount) throw new Error("موجودی قابل استفاده حساب کافی نیست.");

        const expenseCategory = categories.find(c => c.name.includes('پس‌انداز')) || categories[0];

        const contributionDate = new Date().toISOString();
        const balanceBefore = account.balance;
        const balanceAfter = balanceBefore - amount;
        
        const { data: expenseData, error: expenseError } = await supabase.from('expenses').insert({
            owner_id: account.ownerId,
            registered_by_user_id: user.uid,
            amount: amount,
            bank_account_id: bankAccountId,
            category_id: expenseCategory.id,
            date: contributionDate,
            description: `پس انداز برای هدف: ${goal.name}`,
            type: 'expense',
            sub_type: 'goal_contribution',
            goal_id: goal.id,
            expense_for: goal.ownerId,
        }).select().single();

        if (expenseError) throw expenseError;

        const newCurrentAmount = goal.currentAmount + amount;
        const newBlockedBalance = (account.blockedBalance || 0) + amount;
        
        const { error: accountUpdateError } = await supabase
            .from('bank_accounts')
            .update({ balance: balanceAfter, blocked_balance: newBlockedBalance })
            .eq('id', bankAccountId);
        
        if (accountUpdateError) throw accountUpdateError;
        
        const { error: goalUpdateError } = await supabase
            .from('financial_goals')
            .update({ current_amount: newCurrentAmount })
            .eq('id', goal.id);

        if (goalUpdateError) throw goalUpdateError;

        toast({ title: 'موفقیت', description: `مبلغ با موفقیت به پس‌انداز هدف "${goal.name}" اضافه شد.` });
        setContributingGoal(null);

        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const bankAccountOwnerName = account.ownerId === 'shared_account' ? 'مشترک' : (account.ownerId && USER_DETAILS[account.ownerId as 'ali' | 'fatemeh']?.firstName);
        const notificationDetails: TransactionDetails = {
            type: 'payment',
            title: `پس‌انداز برای هدف: ${goal.name}`,
            amount: amount,
            date: new Date().toISOString(),
            icon: 'PiggyBank',
            color: 'rgb(236 72 153)',
            registeredBy: currentUserFirstName,
            bankAccount: { name: account.bankName, owner: bankAccountOwnerName || 'نامشخص' },
            expenseFor: (goal.ownerId && USER_DETAILS[goal.ownerId as 'ali' | 'fatemeh']?.firstName) || 'مشترک',
            properties: [
                { label: 'مبلغ پس‌انداز شده', value: formatCurrency(newCurrentAmount, 'IRT') },
                { label: 'باقی‌مانده تا هدف', value: formatCurrency(goal.targetAmount - newCurrentAmount, 'IRT') }
            ]
        };
        await sendSystemNotification(user.uid, notificationDetails);

     } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در افزودن پس‌انداز', description: error.message || "مشکلی در عملیات پیش آمد." });
     } finally {
        setIsSubmitting(false);
     }
  }, [user, toast, bankAccounts, users, categories]);


   const handleAchieveGoal = useCallback(async ({ goal, actualCost, paymentCardId }: { goal: FinancialGoal; actualCost: number; paymentCardId?: string; }) => {
    if (!user || !categories || !users || !bankAccounts) return;
    setIsSubmitting(true);

    try {
        const { error } = await supabase.rpc('achieve_financial_goal', {
            p_goal_id: goal.id,
            p_actual_cost: actualCost,
            p_user_id: user.id,
            p_payment_card_id: paymentCardId || null
        });

        if (error) {
            // The RPC function returns a user-friendly error message.
            throw new Error(error.message);
        }

        toast({ title: "تبریک!", description: `هدف "${goal.name}" با موفقیت محقق شد.` });
        setAchievingGoal(null);
        
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const notificationDetails: TransactionDetails = {
            type: 'payment',
            title: `هدف محقق شد: ${goal.name}`,
            amount: actualCost,
            date: new Date().toISOString(),
            icon: 'Trophy',
            color: 'rgb(234 179 8)',
            registeredBy: currentUserFirstName,
            expenseFor: (goal.ownerId && USER_DETAILS[goal.ownerId as 'ali' | 'fatemeh']?.firstName) || 'مشترک',
            properties: [
                { label: 'هزینه نهایی', value: formatCurrency(actualCost, 'IRT') },
                { label: 'مبلغ پس‌انداز شده', value: formatCurrency(goal.currentAmount, 'IRT') },
            ]
        };
        await sendSystemNotification(user.uid, notificationDetails);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در تحقق هدف",
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, categories, users, toast, bankAccounts]);


   const handleRevertGoal = useCallback(async (goal: FinancialGoal) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const { error } = await supabase.rpc('revert_financial_goal', { p_goal_id: goal.id });
        if (error) throw error;
        toast({ title: 'موفقیت', description: 'هدف با موفقیت بازگردانی و هزینه‌های آن حذف شد. مبالغ به حساب‌ها و پس‌انداز بازگشت.' });
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'خطا', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, toast]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const { error } = await supabase.rpc('delete_financial_goal', { p_goal_id: goalId });
        if (error) throw new Error(error.message);

        toast({ title: "موفقیت", description: "هدف مالی، هزینه‌ها و مبالغ مسدود شده مرتبط با آن با موفقیت حذف شد." });
    } catch (error: any) {
          toast({
            variant: "destructive",
            title: "خطا در حذف هدف",
            description: error.message || "مشکلی در حذف هدف پیش آمد.",
          });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, toast]);


  const handleAddNew = useCallback(() => {
    setEditingGoal(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenAchieveDialog = useCallback((goal: FinancialGoal) => {
    setAchievingGoal(goal);
  }, []);
  
  const handleOpenContributeDialog = useCallback((goal: FinancialGoal) => {
    setContributingGoal(goal);
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
            اهداف مالی
          </h1>
        </div>
        <div className="hidden md:block">
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                افزودن هدف جدید
            </Button>
        </div>
      </div>

       {isFormOpen && (
        <GoalForm
          onSubmit={handleFormSubmit}
          initialData={editingGoal}
          bankAccounts={bankAccounts || []}
          user={user}
          onCancel={() => { setIsFormOpen(false); setEditingGoal(null); }}
          isSubmitting={isSubmitting}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : !isFormOpen && (
        <>
          <GoalList
            goals={goals || []}
            users={users || []}
            onContribute={handleOpenContributeDialog}
            onAchieve={handleOpenAchieveDialog}
            onRevert={handleRevertGoal}
            onDelete={handleDeleteGoal}
            isSubmitting={isSubmitting}
          />
          {achievingGoal && (
            <AchieveGoalDialog
              goal={achievingGoal}
              bankAccounts={bankAccounts || []}
              isOpen={!!achievingGoal}
              onOpenChange={() => setAchievingGoal(null)}
              onSubmit={handleAchieveGoal}
              isSubmitting={isSubmitting}
            />
          )}
          {contributingGoal && (
             <AddToGoalDialog
                goal={contributingGoal}
                bankAccounts={bankAccounts || []}
                isOpen={!!contributingGoal}
                onOpenChange={() => setContributingGoal(null)}
                onSubmit={handleAddToGoal}
                isSubmitting={isSubmitting}
             />
          )}
        </>
      )}

      {!isFormOpen && (
        <div className="md:hidden fixed bottom-20 right-4 z-50">
            <Button
              onClick={handleAddNew}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg"
              aria-label="افزودن هدف جدید"
            >
              <Plus className="h-6 w-6" />
            </Button>
        </div>
      )}
    </div>
  );
}
