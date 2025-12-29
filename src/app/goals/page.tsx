
'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { FinancialGoal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GoalList } from '@/components/goals/goal-list';
import { GoalForm } from '@/components/goals/goal-form';
import { AchieveGoalDialog } from '@/components/goals/achieve-goal-dialog';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { AddToGoalDialog } from '@/components/goals/add-to-goal-dialog';
import { supabase } from '@/lib/supabase-client';
import { useUser } from '@/hooks/use-user'; // <-- Using the new standardized hook

export default function GoalsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData, refreshData } = useDashboardData(); // Assuming refreshData exists

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [achievingGoal, setAchievingGoal] = useState<FinancialGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<FinancialGoal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { goals, bankAccounts, users } = allData;

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user) return;
    setIsSubmitting(true);

    const { image_path, ...goalData } = values;

    try {
      if (editingGoal) {
        // Logic for UPDATING an existing goal
        const { error } = await supabase
          .from('financial_goals')
          .update({
            name: goalData.name,
            target_amount: goalData.targetAmount,
            target_date: goalData.targetDate.toISOString(),
            priority: goalData.priority,
            owner_id: goalData.ownerId,
            image_path: image_path, // Update the image path
          })
          .eq('id', editingGoal.id);
        if (error) throw error;
        toast({ title: 'موفقیت', description: 'هدف مالی با موفقیت ویرایش شد.' });
      } else {
        // Logic for CREATING a new goal
        const { error } = await supabase
          .from('financial_goals')
          .insert({
            name: goalData.name,
            target_amount: goalData.targetAmount,
            current_amount: 0, // Initial amount is always 0
            target_date: goalData.targetDate.toISOString(),
            priority: goalData.priority,
            owner_id: goalData.ownerId,
            registered_by_user_id: user.id, // Correct user ID
            is_achieved: false,
            image_path: image_path,
          });
        if (error) throw error;
        toast({ title: 'موفقیت', description: 'هدف مالی جدید با موفقیت ایجاد شد.' });
      }
      
      refreshData(); // Refresh data to show changes
      setIsFormOpen(false);
      setEditingGoal(null);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطا در ذخیره‌سازی هدف',
        description: error.message || 'مشکلی در ثبت اطلاعات پیش آمد.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, toast, editingGoal, refreshData]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('delete_financial_goal', { p_goal_id: goalId });
      if (error) throw new Error(error.message);
      toast({ title: "موفقیت", description: "هدف مالی با موفقیت حذف شد." });
      refreshData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطا در حذف هدف",
        description: error.message || "مشکلی در حذف هدف پیش آمد.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, toast, refreshData]);

  const handleAddNew = useCallback(() => {
    setEditingGoal(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  }, []);

  const handleCancel = () => {
      setIsFormOpen(false);
      setEditingGoal(null);
  }

  // Other handlers remain the same...

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight font-headline">اهداف مالی</h2>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          افزودن هدف جدید
        </Button>
      </div>

      {isFormOpen && (
        <GoalForm
          key={editingGoal ? editingGoal.id : 'new'}
          onSubmit={handleFormSubmit}
          initialData={editingGoal}
          bankAccounts={bankAccounts || []}
          user={user}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-60 w-full rounded-xl" />)}
        </div>
      ) : !isFormOpen && (
        <>
          <GoalList
            goals={goals || []}
            users={users || []}
            onEdit={handleEdit} // Pass the edit handler
            onDelete={handleDeleteGoal}
            isSubmitting={isSubmitting}
            // Pass other handlers as needed
          />
          {/* Dialogs will be managed here */}
        </>
      )}
    </div>
  );
}
