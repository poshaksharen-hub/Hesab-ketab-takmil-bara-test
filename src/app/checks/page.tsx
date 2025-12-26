
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

type CheckFormData = Omit<Check, 'id' | 'registeredByUserId' | 'status'> & { signatureDataUrl?: string };

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
            p_registered_by_user_id: user.uid
        });

        if (error) throw new Error(error.message);

        setIsFormOpen(false);
        setEditingCheck(null);
        toast({ title: 'موفقیت', description: 'چک جدید با موفقیت ثبت و مبلغ آن در حساب مسدود شد.' });

        // Notification Logic
        const payeeName = payees.find(p => p.id === values.payeeId)?.name || 'ناشناس';
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const bankAccount = bankAccounts.find(b => b.id === values.bankAccountId);

        const notificationDetails: TransactionDetails = {
            type: 'check',
            title: `ثبت چک برای ${payeeName}`,
            amount: values.amount,
            date: values.issueDate.toISOString(),
            icon: 'FileText',
            color: 'rgb(245 158 11)',
            registeredBy: currentUserFirstName,
            payee: payeeName,
            expenseFor: USER_DETAILS[values.expenseFor]?.firstName || 'مشترک',
            bankAccount: bankAccount ? { name: bankAccount.bankName, owner: bankAccount.ownerId } : undefined,
            checkDetails: {
                sayadId: values.sayadId,
                dueDate: formatJalaliDate(values.dueDate),
            },
        };
        // await sendSystemNotification(supabase, user.uid, notificationDetails);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در ثبت چک', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, toast, bankAccounts, payees, categories, users, editingCheck]);
  
  const handleClearCheck = React.useCallback(async (check: Check) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const { error } = await supabase.rpc('clear_check', {
            p_check_id: check.id,
            p_user_id: user.id
        });
        if (error) throw new Error(error.message);

        toast({ title: 'موفقیت!', description: `چک به مبلغ ${formatCurrency(check.amount, 'IRT')} با موفقیت پاس و هزینه آن ثبت شد.` });
        
        // --- Notification Logic ---
        const payeeName = payees.find(p => p.id === check.payeeId)?.name;
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const categoryName = categories.find(c => c.id === check.categoryId)?.name;
        const bankAccount = bankAccounts.find(b => b.id === check.bankAccountId);

        const notificationDetails: TransactionDetails = {
            type: 'expense',
            title: `چک پاس شد: ${check.description || `چک برای ${payeeName}`}`,
            amount: check.amount,
            date: new Date().toISOString(),
            icon: 'TrendingDown',
            color: 'rgb(220 38 38)',
            registeredBy: 'سیستم (پاس کردن چک)',
            payee: payeeName,
            category: categoryName,
            expenseFor: USER_DETAILS[check.expenseFor]?.firstName || 'مشترک',
            bankAccount: bankAccount ? { name: bankAccount.bankName, owner: bankAccount.ownerId } : undefined,
        };
        // await sendSystemNotification(supabase, user.uid, notificationDetails);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در پاس کردن چک', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, bankAccounts, payees, categories, users, toast]);
  
  const handleDeleteCheck = React.useCallback(async (check: Check) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const { error } = await supabase.rpc('delete_check', { p_check_id: check.id });
        if (error) throw new Error(error.message);
        toast({ title: 'موفقیت', description: 'چک با موفقیت حذف شد و تغییرات لازم در موجودی حساب اعمال گردید.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در حذف چک', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, toast]);

  const handleAddNew = React.useCallback(() => {
    setEditingCheck(null);
    setIsFormOpen(true);
  }, []);
  
  const handleEdit = React.useCallback((check: Check) => {
    setEditingCheck(check);
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
            مدیریت چک‌ها
          </h1>
        </div>
        <div className="hidden md:block">
            <Button onClick={handleAddNew} disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" />
                ثبت چک جدید
            </Button>
        </div>
      </div>

      {isFormOpen && (
          <CheckForm
            onSubmit={handleFormSubmit}
            initialData={editingCheck}
            bankAccounts={bankAccounts || []}
            payees={payees || []}
            categories={categories || []}
            onCancel={() => { setIsFormOpen(false); setEditingCheck(null); }}
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
        />
      )}

      {!isFormOpen && (
          <div className="md:hidden fixed bottom-20 right-4 z-50">
              <Button
                onClick={handleAddNew}
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg"
                aria-label="ثبت چک جدید"
                disabled={isSubmitting}
              >
                <Plus className="h-6 w-6" />
              </Button>
          </div>
      )}
    </div>
  );
}
