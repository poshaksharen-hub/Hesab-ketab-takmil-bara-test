
'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
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
    // ... (omitted for brevity, no changes here)
  }, [user, editingLoan, bankAccounts, payees, users, toast]);


  const handlePayInstallment = useCallback(async ({ loan, paymentBankAccountId, installmentAmount, attachment_path }: { loan: Loan, paymentBankAccountId: string, installmentAmount: number, attachment_path?: string }) => {
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
            p_user_id: user.id,
            p_attachment_path: attachment_path // Pass the new parameter
        });

        if (error) throw new Error(error.message);

        toast({ title: "موفقیت", description: "قسط با موفقیت پرداخت و به عنوان هزینه ثبت شد." });
        setPayingLoan(null);
        
        // ... (notification logic remains the same)

    } catch (error: any) {
        toast({ variant: "destructive", title: "خطا در پرداخت قسط", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, bankAccounts, categories, payees, users, toast]);

  const handleDelete = useCallback(async (loanId: string) => {
    // ... (omitted for brevity, no changes here)
  }, [user, toast]);

  // ... (other handlers remain the same)
  const handleAddNew = () => { setEditingLoan(null); setIsFormOpen(true); };
  const handleCancelForm = () => { setEditingLoan(null); setIsFormOpen(false); }
  const handleEdit = useCallback((loan: Loan) => { setEditingLoan(loan); setIsFormOpen(true); }, []);
  
  const isLoading = isUserLoading || isDashboardLoading;
  
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
         <h1 className="font-headline text-3xl font-bold tracking-tight">مدیریت وام‌ها</h1>
         <Button onClick={handleAddNew} disabled={isSubmitting}><PlusCircle className="mr-2 h-4 w-4" />ثبت وام جدید</Button>
      </div>
      
      {isLoading ? (
         <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <>
            <LoanList
                loans={loans || []}
                payees={payees || []}
                users={users || []}
                loanPayments={allData.loanPayments || []} // Pass loan payments
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
      
      <div className="md:hidden fixed bottom-20 right-4 z-50">
          <Button onClick={handleAddNew} size="icon" className="h-14 w-14 rounded-full shadow-lg" aria-label="ثبت وام جدید" disabled={isSubmitting}>
            <Plus className="h-6 w-6" />
          </Button>
      </div>
    </div>
  );
}
