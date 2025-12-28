
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

// Match the form values from income-form.tsx
type IncomeFormData = Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'registeredByUserId' | 'type' | 'category'> & { attachment_path?: string };

export default function IncomePage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData, error } = useDashboardData();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const { incomes: allIncomes, bankAccounts: allBankAccounts, users } = allData;

  const handleFormSubmit = useCallback(async (values: IncomeFormData) => {
    if (!user || !allBankAccounts || !users) return;
    
    setIsSubmitting(true);
    const isoDate = (values.date as Date).toISOString();
    
    try {
      if (editingIncome) {
        // --- UPDATE LOGIC ---
        const { error: updateError } = await supabase
          .from('incomes')
          .update({
            amount: values.amount,
            description: values.description,
            date: isoDate,
            owner_id: values.ownerId,
            bank_account_id: values.bankAccountId,
            source_text: values.source || values.description,
            attachment_path: values.attachment_path, // Update attachment path
          })
          .eq('id', editingIncome.id);

        if (updateError) throw updateError;
        toast({ title: "موفقیت", description: "درآمد با موفقیت ویرایش شد." });

      } else {
        // --- CREATE LOGIC ---
        const account = allBankAccounts.find(acc => acc.id === values.bankAccountId);
        if (!account) throw new Error("کارت بانکی یافت نشد");

        const balanceBefore = account.balance;
        const balanceAfter = balanceBefore + values.amount;

        const { error: accountError } = await supabase
          .from('bank_accounts')
          .update({ balance: balanceAfter })
          .eq('id', account.id);

        if (accountError) throw accountError;

        const { error: incomeError } = await supabase.from('incomes').insert([{
            amount: values.amount,
            description: values.description,
            date: isoDate,
            owner_id: values.ownerId,
            bank_account_id: values.bankAccountId,
            source_text: values.source || values.description,
            category: 'درآمد',
            registered_by_user_id: user.uid,
            attachment_path: values.attachment_path, // Add attachment path
        }]);
      
        if (incomeError) {
          await supabase.from('bank_accounts').update({ balance: balanceBefore }).eq('id', account.id);
          throw incomeError;
        }

        toast({ title: "موفقیت", description: "درآمد جدید با موفقیت ثبت شد." });
        // Notification logic for new income can be added here...
      }

      setIsFormOpen(false);
      setEditingIncome(null);

    } catch (error: any) {
        toast({
          variant: "destructive",
          title: editingIncome ? "خطا در ویرایش درآمد" : "خطا در ثبت درآمد",
          description: error.message || "مشکلی در ثبت اطلاعات پیش آمد.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, allBankAccounts, users, toast, editingIncome]);

  const handleDelete = useCallback(async (incomeId: string) => {
     // ... (delete logic remains the same)
  }, [allIncomes, allBankAccounts, toast]);

  const handleAddNew = useCallback(() => {
    setEditingIncome(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((income: Income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  }, []);
  
  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        {/* ... Header ... */}
         <h1 className="font-headline text-3xl font-bold tracking-tight">مدیریت درآمدها</h1>
          <Button onClick={handleAddNew} disabled={isSubmitting}><PlusCircle className="mr-2 h-4 w-4" />ثبت درآمد جدید</Button>
      </div>

       <IncomeForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingIncome}
          bankAccounts={allBankAccounts || []}
          user={user}
          isSubmitting={isSubmitting}
        />

      {isLoading ? (
          <div className="space-y-4 mt-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
          </div>
      ) : (
        <IncomeList
          incomes={allIncomes || []}
          bankAccounts={allBankAccounts || []}
          users={users || []}
          onDelete={handleDelete}
          onEdit={handleEdit} // Pass the new handler
        />
      )}

      <div className="md:hidden fixed bottom-20 right-4 z-50">
          <Button onClick={handleAddNew} size="icon" className="h-14 w-14 rounded-full shadow-lg" aria-label="ثبت درآمد جدید" disabled={isSubmitting}>
            <Plus className="h-6 w-6" />
          </Button>
      </div>
    </div>
  );
}
