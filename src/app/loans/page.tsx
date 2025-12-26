
'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import type { Loan, BankAccount, Category, TransactionDetails, LoanPayment, Expense, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { LoanList } from '@/components/loans/loan-list';
import { LoanForm } from '@/components/loans/loan-form';
import { LoanPaymentDialog } from '@/components/loans/loan-payment-dialog';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendSystemNotification } from '@/lib/notifications';
import { USER_DETAILS } from '@/lib/constants';
import { supabase } from '@/lib/supabase-client';


export default function LoansPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    loans,
    bankAccounts,
    categories,
    payees,
    users,
  } = allData;

 const handleFormSubmit = useCallback(async (loanValues: any) => {
    if (!user || !users || !bankAccounts || !payees) {
        toast({ title: 'خطای سیستمی', description: 'سرویس‌های مورد نیاز بارگذاری نشده‌اند.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);

    try {
        if (editingLoan) {
            // --- EDIT LOGIC ---
            const { error } = await supabase.rpc('update_loan', {
                p_loan_id: editingLoan.id,
                p_title: loanValues.title,
                p_amount: loanValues.amount,
                p_installment_amount: loanValues.installmentAmount,
                p_number_of_installments: loanValues.numberOfInstallments,
                p_start_date: loanValues.startDate,
                p_first_installment_date: loanValues.firstInstallmentDate,
                p_payee_id: loanValues.payeeId || null
            });
            if (error) throw new Error(error.message);
            toast({ title: 'موفقیت', description: `وام با موفقیت ویرایش شد.` });
        } else {
            // --- CREATE LOGIC ---
            const { error } = await supabase.rpc('create_loan', {
                p_title: loanValues.title,
                p_amount: loanValues.amount,
                p_owner_id: loanValues.ownerId,
                p_installment_amount: loanValues.installmentAmount,
                p_number_of_installments: loanValues.numberOfInstallments,
                p_start_date: loanValues.startDate,
                p_first_installment_date: loanValues.firstInstallmentDate,
                p_payee_id: loanValues.payeeId || null,
                p_deposit_on_create: loanValues.depositOnCreate,
                p_deposit_to_account_id: loanValues.depositToAccountId || null,
                p_registered_by_user_id: user.id
            });
            if (error) throw new Error(error.message);
            
            toast({ title: 'موفقیت', description: `وام با موفقیت ثبت شد.` });
            
            const currentUser = users.find(u => u.id === user.id);
            const payeeName = payees.find(p => p.id === loanValues.payeeId)?.name;
            const bankAccount = bankAccounts.find(b => b.id === loanValues.depositToAccountId);
            const accountOwner = bankAccount?.ownerId === 'shared_account' ? 'مشترک' : (bankAccount?.ownerId && USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh']?.firstName);
             
            const notificationDetails: TransactionDetails = { 
                type: 'loan', 
                title: `ثبت وام جدید: ${loanValues.title}`, 
                amount: loanValues.amount, 
                date: loanValues.startDate, 
                icon: 'Landmark', 
                color: 'rgb(139 92 246)', 
                registeredBy: currentUser?.firstName || 'کاربر',
                expenseFor: USER_DETAILS[loanValues.ownerId as 'ali' | 'fatemeh']?.firstName || 'مشترک',
                payee: payeeName,
                properties: [
                    { label: 'تعداد اقساط', value: loanValues.numberOfInstallments ? `${loanValues.numberOfInstallments} ماه` : 'نامشخص' },
                    { label: 'مبلغ هر قسط', value: loanValues.installmentAmount ? formatCurrency(loanValues.installmentAmount, 'IRT') : 'نامشخص' },
                ],
                bankAccount: loanValues.depositOnCreate && bankAccount ? { name: bankAccount.bankName, owner: accountOwner || 'نامشخص' } : undefined
            };
            // await sendSystemNotification(firestore, user.uid, notificationDetails);
        }
        setIsFormOpen(false);
        setEditingLoan(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: `خطا در عملیات وام`, description: error.message || 'مشکلی در ثبت اطلاعات پیش آمد.' });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, editingLoan, bankAccounts, payees, users, toast]);


  const handlePayInstallment = useCallback(async ({ loan, paymentBankAccountId, installmentAmount }: { loan: Loan, paymentBankAccountId: string, installmentAmount: number }) => {
    if (!user || !users) return;

    if (installmentAmount <= 0) {
        toast({ variant: "destructive", title: "خطا", description: "مبلغ قسط باید بیشتر از صفر باشد."});
        return;
    }
    setIsSubmitting(true);
    
    try {
        const { error } = await supabase.rpc('pay_loan_installment', {
            p_loan_id: loan.id,
            p_bank_account_id: paymentBankAccountId,
            p_amount: installmentAmount,
            p_user_id: user.id
        });

        if (error) throw new Error(error.message);

        toast({ title: "موفقیت", description: "قسط با موفقیت پرداخت و به عنوان هزینه ثبت شد." });
        setPayingLoan(null);
        
        const currentUser = users.find(u => u.id === user.id);
        const bankAccount = bankAccounts.find(b => b.id === paymentBankAccountId);
        const accountOwner = bankAccount?.ownerId === 'shared_account' ? 'مشترک' : (bankAccount?.ownerId && USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh']?.firstName);
        
        const notificationDetails: TransactionDetails = { 
            type: 'payment', 
            title: `پرداخت قسط وام: ${loan.title}`, 
            amount: installmentAmount, 
            date: new Date().toISOString(), 
            icon: 'CheckCircle', 
            color: 'rgb(22 163 74)', 
            registeredBy: currentUser?.firstName || 'کاربر',
            payee: payees.find(p => p.id === loan.payeeId)?.name,
            expenseFor: USER_DETAILS[loan.ownerId as 'ali' | 'fatemeh']?.firstName || 'مشترک',
            bankAccount: { name: bankAccount?.bankName || 'نامشخص', owner: accountOwner || 'نامشخص' },
            properties: [
                { label: 'اقساط پرداخت شده', value: `${loan.paidInstallments + 1} از ${loan.numberOfInstallments}` },
                { label: 'مبلغ باقی‌مانده', value: formatCurrency(loan.remainingAmount - installmentAmount, 'IRT') },
            ]
        };
        // await sendSystemNotification(firestore, user.uid, notificationDetails);

    } catch (error: any) {
        toast({ variant: "destructive", title: "خطا در پرداخت قسط", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, bankAccounts, categories, payees, users, toast]);

  const handleDelete = useCallback(async (loanId: string) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const { error } = await supabase.rpc('delete_loan', { p_loan_id: loanId });
        if (error) throw new Error(error.message);

        toast({ title: "موفقیت", description: "وام با موفقیت حذف شد." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "خطا در حذف وام", description: error.message || "مشکلی در حذف وام پیش آمد." });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, toast]);

  const handleAddNew = () => {
    setEditingLoan(null);
    setIsFormOpen(true);
  };
  
  const handleCancelForm = () => {
      setEditingLoan(null);
      setIsFormOpen(false);
  }

  const handleEdit = useCallback((loan: Loan) => {
    setEditingLoan(loan);
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
            <h1 className="font-headline text-3xl font-bold tracking-tight">مدیریت وام‌ها</h1>
        </div>
        {!isFormOpen && (
            <div className="hidden md:block">
                <Button onClick={handleAddNew} disabled={isSubmitting}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    ثبت وام جدید
                </Button>
            </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        </div>
      ) : isFormOpen ? (
            <LoanForm
                onCancel={handleCancelForm}
                onSubmit={handleFormSubmit}
                initialData={editingLoan}
                bankAccounts={bankAccounts || []}
                payees={payees || []}
                user={user}
                isSubmitting={isSubmitting}
            />
      ) : (
        <>
            <LoanList
                loans={loans || []}
                payees={payees || []}
                users={users || []}
                onDelete={handleDelete}
                onPay={setPayingLoan}
                onEdit={handleEdit}
                isSubmitting={isSubmitting}
            />
            {payingLoan && (
                <LoanPaymentDialog
                    loan={payingLoan}
                    bankAccounts={bankAccounts || []}
                    isOpen={!!payingLoan}
                    onOpenChange={() => setPayingLoan(null)}
                    onSubmit={handlePayInstallment}
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
                aria-label="ثبت وام جدید"
                disabled={isSubmitting}
            >
                <Plus className="h-6 w-6" />
            </Button>
        </div>
      )}
    </div>
  );
}
