
'use client';

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import { CheckList } from '@/components/checks/check-list';
import { CheckForm } from '@/components/checks/check-form';
import type { Check, BankAccount, Payee, Category, Expense, TransactionDetails, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { USER_DETAILS } from '@/lib/constants';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { supabase } from '@/lib/supabase-client';
import { sendSystemNotification } from '@/lib/notifications';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';

type CheckFormData = Omit<Check, 'id' | 'registeredByUserId' | 'status'> & { signatureDataUrl?: string; image_path?: string };

export default function ChecksPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const { isLoading: isDashboardLoading, allData } = useDashboardData();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCheck, setEditingCheck] = React.useState<Check | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const { checks, bankAccounts, payees, categories, users } = allData;

  const handleFormSubmit = useCallback(async (values: CheckFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
        const { error } = await supabase.rpc('create_check', {
            p_sayad_id: values.sayadId,
            p_serial_number: values.checkSerialNumber,
            p_amount: values.amount,
            p_issue_date: values.issueDate.toISOString(),
            p_due_date: values.dueDate.toISOString(),
            p_bank_account_id: values.bankAccountId,
            p_payee_id: values.payeeId,
            p_category_id: values.categoryId,
            p_description: values.description,
            p_expense_for: values.expenseFor,
            p_signature_data_url: values.signatureDataUrl,
            p_registered_by_user_id: user.uid,
            p_image_path: values.image_path
        });

        if (error) throw new Error(error.message);

        setIsFormOpen(false);
        setEditingCheck(null);
        toast({ title: 'موفقیت', description: 'چک جدید با موفقیت ثبت و مبلغ آن در حساب مسدود شد.' });

        // Notification Logic remains largely the same
        // ...

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در ثبت چک', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, toast, bankAccounts, payees, categories, users]);
  
  const handleClearCheck = useCallback(async (data: { check: Check; receiptPath?: string }) => {
    const { check, receiptPath } = data;
    if (!user) return;
    setIsSubmitting(true);
    try {
        const { error } = await supabase.rpc('clear_check', {
            p_check_id: check.id,
            p_user_id: user.id,
            p_clearance_receipt_path: receiptPath // Pass the new receipt path
        });
        if (error) throw new Error(error.message);

        toast({ title: 'موفقیت!', description: `چک به مبلغ ${formatCurrency(check.amount, 'IRT')} با موفقیت پاس و هزینه آن ثبت شد.` });
        
        // Notification Logic remains the same
        // ...

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در پاس کردن چک', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, bankAccounts, payees, categories, users, toast]);
  
  const handleDeleteCheck = useCallback(async (check: Check) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const { error } = await supabase.rpc('delete_check', { p_check_id: check.id });
        if (error) throw new Error(error.message);
        toast({ title: 'موفقیت', description: 'چک با موفقیت حذف شد.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در حذف چک', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, toast]);

  const handleAddNew = useCallback(() => {
    setEditingCheck(null);
    setIsFormOpen(true);
  }, []);
  
  const handleEdit = useCallback((check: Check) => {
    setEditingCheck(check);
    setIsFormOpen(true);
  }, []);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        {/* ... Header ... */}
      </div>

      {isFormOpen && (
          <CheckForm
            onSubmit={handleFormSubmit}
            initialData={editingCheck}
            bankAccounts={bankAccounts || []}
            payees={payees || []}
            categories={categories || []}
            onCancel={() => { setIsFormOpen(false); setEditingCheck(null); }}
            user={user}
            isSubmitting={isSubmitting}
        />
      )}

      {isLoading ? (
          <div className="space-y-4 mt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : !isFormOpen && (
        <CheckList
          checks={checks || []}
          bankAccounts={bankAccounts || []}
          payees={payees || []}
          categories={categories || []}
          onClear={handleClearCheck}
          onDelete={handleDeleteCheck}
          onEdit={handleEdit}
          users={users || []}
          isSubmitting={isSubmitting}
        />
      )}

      {!isFormOpen && (
        <div className="md:hidden fixed bottom-20 right-4 z-50">
            {/* ... Floating Action Button ... */}
        </div>
      )}
    </div>
  );
}
