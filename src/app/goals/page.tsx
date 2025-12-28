
'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
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
import type { User } from '@supabase/supabase-js';


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
    // Destructure all fields, including the new image_path
    const { initialContributionAmount = 0, initialContributionBankAccountId, image_path, ...goalData } = values;

    try {
        // Use the official table name 'goals' from now on for consistency
        const { data: newGoal, error: goalError } = await supabase
            .from('goals') // Corrected table name
            .insert({
                name: goalData.name,
                target_amount: goalData.targetAmount,
                target_date: goalData.targetDate.toISOString(),
                priority: goalData.priority,
                owner_id: goalData.ownerId,
                registered_by_user_id: user.uid,
                is_achieved: false,
                current_amount: 0,
                image_path: image_path, // <-- The new field is added here!
            })
            .select()
            .single();

        if (goalError) throw goalError;

        // The rest of the logic for initial contribution remains the same
        let finalCurrentAmount = 0;
        if (initialContributionBankAccountId && initialContributionAmount > 0) {
           // ... (existing logic for handling contribution)
        }

        toast({ title: 'موفقیت', description: `هدف مالی جدید با موفقیت ذخیره شد.` });
        setIsFormOpen(false);
        
        // ... (existing logic for sending notification)

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

  // ... All other handler functions (handleAddToGoal, handleAchieveGoal, etc.) remain unchanged ...

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
        // IMPORTANT: We need a new function to also delete the image from storage
        // For now, we only delete the database record.
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
        {/* ... JSX for header ... */}
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
          {/* ... JSX for dialogs ... */}
        </>
      )}

      {!isFormOpen && (
        <div className="md:hidden fixed bottom-20 right-4 z-50">
            {/* ... JSX for floating action button ... */}
        </div>
      )}
    </div>
  );
}
