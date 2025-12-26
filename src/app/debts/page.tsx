
'use client';
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import type { PreviousDebt, BankAccount, Category, Payee, Expense, UserProfile, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { DebtList } from '@/components/debts/debt-list';
import { DebtForm } from '@/components/debts/debt-form';
import { PayDebtDialog } from '@/components/debts/pay-debt-dialog';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { USER_DETAILS } from '@/lib/constants';
import { supabase } from '@/lib/supabase-client';


export default function DebtsPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState<PreviousDebt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    previousDebts,
    bankAccounts,
    categories,
    payees,
    users,
  } = allData;

 const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !users) {
        toast({ title: "خطا", description: "برای ثبت بدهی باید ابتدا وارد شوید.", variant: "destructive" });
        return;
    };
    setIsSubmitting(true);
    
    try {
        const debtData = {
            description: values.description,
            amount: values.amount,
            remaining_amount: values.amount,
            payee_id: values.payeeId,
            owner_id: values.ownerId,
            start_date: (values.startDate as Date).toISOString(),
            is_installment: values.isInstallment,
            due_date: values.isInstallment ? null : (values.dueDate as Date)?.toISOString(),
            first_installment_date: values.isInstallment ? (values.firstInstallmentDate as Date)?.toISOString() : null,
            number_of_installments: values.numberOfInstallments || null,
            installment_amount: values.installmentAmount || null,
            paid_installments: 0,
            registered_by_user_id: user.uid,
        };

        const { error } = await supabase.from('debts').insert([debtData]);

        if (error) throw error;
        
        toast({ title: 'موفقیت', description: 'بدهی جدید با موفقیت ثبت شد.' });
        setIsFormOpen(false);

        // --- Notification Logic ---
        const payeeName = payees.find(p => p.id === values.payeeId)?.name;
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const startDate = values.startDate instanceof Date ? values.startDate.toISOString() : values.startDate;
        const dueDate = values.dueDate instanceof Date ? values.dueDate.toISOString() : values.dueDate;
        
        const notificationDetails: TransactionDetails = {
            type: 'debt',
            title: `ثبت بدهی جدید به ${payeeName}`,
            amount: values.amount,
            date: startDate,
            icon: 'Handshake',
            color: 'rgb(99 102 241)',
            registeredBy: currentUserFirstName,
            payee: payeeName,
            expenseFor: (values.ownerId && USER_DETAILS[values.ownerId as 'ali' | 'fatemeh']?.firstName) || 'مشترک',
            properties: [
                { label: 'شرح', value: values.description },
                { label: 'نوع پرداخت', value: values.isInstallment ? 'قسطی' : 'یکجا' },
                ...(values.isInstallment ? [
                    { label: 'تعداد اقساط', value: values.numberOfInstallments ? `${values.numberOfInstallments} ماه` : 'نامشخص' },
                    { label: 'مبلغ هر قسط', value: values.installmentAmount ? formatCurrency(values.installmentAmount, 'IRT') : 'نامشخص' },
                ] : [
                    { label: 'تاریخ سررسید', value: dueDate ? formatJalaliDate(new Date(dueDate)) : 'نامشخص' },
                ])
            ]
        };
        await sendSystemNotification(user.uid, notificationDetails);

    } catch (error: any) {
        console.error("Error in handleFormSubmit:", error);
        toast({
            variant: 'destructive',
            title: 'خطا در ثبت بدهی',
            description: error.message || 'مشکلی در عملیات پیش آمد.'
        });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, toast, payees, users]);


  const handlePayDebt = useCallback(async ({ debt, paymentBankAccountId, amount }: { debt: PreviousDebt, paymentBankAccountId: string, amount: number }) => {
    if (!user || !users || !bankAccounts || !payees) return;

    if (amount <= 0) {
        toast({ variant: "destructive", title: "خطا", description: "مبلغ پرداختی باید بیشتر از صفر باشد."});
        return;
    }
    setIsSubmitting(true);
    
    try {
        const { error } = await supabase.rpc('pay_debt_installment', {
            p_debt_id: debt.id,
            p_bank_account_id: paymentBankAccountId,
            p_amount: amount,
            p_user_id: user.id
        });

        if (error) throw new Error(error.message);

        toast({ title: "موفقیت", description: "پرداخت با موفقیت ثبت و به عنوان هزینه در سیستم منظور شد." });
        setPayingDebt(null);

        // --- Notification Logic ---
        const payeeName = payees.find(p => p.id === debt.payeeId)?.name;
        const bankAccount = bankAccounts.find(b => b.id === paymentBankAccountId);
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const accountOwner = bankAccount?.ownerId === 'shared_account' ? 'مشترک' : (bankAccount?.ownerId && USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh']?.firstName);

        const notificationDetails: TransactionDetails = {
            type: 'payment',
            title: `پرداخت بدهی به ${payeeName}`,
            amount: amount,
            date: new Date().toISOString(),
            icon: 'CheckCircle',
            color: 'rgb(22 163 74)',
            registeredBy: currentUserFirstName,
            payee: payeeName,
            expenseFor: (debt.ownerId && USER_DETAILS[debt.ownerId as 'ali' | 'fatemeh']?.firstName) || 'مشترک',
            bankAccount: { name: bankAccount?.bankName || 'نامشخص', owner: accountOwner || 'نامشخص' },
            properties: [
                { label: 'شرح', value: debt.description },
                { label: 'مبلغ باقی‌مانده', value: formatCurrency(debt.remainingAmount - amount, 'IRT') },
            ]
        };
        await sendSystemNotification(user.uid, notificationDetails);
    
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'خطا در پرداخت بدهی',
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, categories, bankAccounts, toast, payees, users]);

  const handleDeleteDebt = useCallback(async (debtId: string) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
        const { error } = await supabase.rpc('delete_debt', { p_debt_id: debtId });
        if (error) throw new Error(error.message);

        toast({ title: "موفقیت", description: "بدهی با موفقیت حذف شد." });
    } catch (error: any) {
         toast({ variant: "destructive", title: "خطا در حذف", description: error.message || "مشکلی در حذف بدهی پیش آمد." });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, previousDebts, toast]);

  const handleAddNew = () => setIsFormOpen(true);
  const handleCancel = () => setIsFormOpen(false);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8 md:pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/" passHref>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <ArrowRight className="h-5 w-5" />
                </Button>
            </Link>
            <h1 className="font-headline text-3xl font-bold tracking-tight">مدیریت بدهی‌ها</h1>
        </div>
        {!isFormOpen && (
            <Button onClick={handleAddNew} className='hidden md:inline-flex'>
              <PlusCircle className="ml-2 h-4 w-4" />
              ثبت بدهی جدید
            </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 mt-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : isFormOpen ? (
        <DebtForm
            onCancel={handleCancel}
            onSubmit={handleFormSubmit}
            payees={payees || []}
            isSubmitting={isSubmitting}
        />
      ) : (
        <>
            <DebtList
                debts={previousDebts || []}
                payees={payees || []}
                onPay={setPayingDebt}
                onDelete={handleDeleteDebt}
                users={users || []}
                isSubmitting={isSubmitting}
            />
            {payingDebt && (
                <PayDebtDialog
                    debt={payingDebt}
                    bankAccounts={bankAccounts || []}
                    isOpen={!!payingDebt}
                    onOpenChange={() => setPayingDebt(null)}
                    onSubmit={handlePayDebt}
                    isSubmitting={isSubmitting}
                />
            )}
        </>
      )}
       {!isFormOpen && (
         <Button
            onClick={handleAddNew}
            className="md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-20"
            size="icon"
            aria-label="ثبت بدهی جدید"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}
    </main>
  );
}
