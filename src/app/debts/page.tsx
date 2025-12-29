
'use client';
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
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
    debtPayments
  } = allData;

 const handleFormSubmit = useCallback(async (values: any) => {
    // ... (omitted for brevity, no changes here)
  }, [user, toast, payees, users]);


  const handlePayDebt = useCallback(async ({ debt, paymentBankAccountId, amount, attachment_path }: { debt: PreviousDebt, paymentBankAccountId: string, amount: number, attachment_path?: string }) => {
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
            p_user_id: user.id,
            p_attachment_path: attachment_path // Pass the new parameter
        });

        if (error) throw new Error(error.message);

        toast({ title: "موفقیت", description: "پرداخت با موفقیت ثبت و به عنوان هزینه در سیستم منظور شد." });
        setPayingDebt(null);

        // ... (notification logic remains the same)
    
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
    // ... (omitted for brevity, no changes here)
  }, [user, previousDebts, toast]);

  const handleAddNew = () => setIsFormOpen(true);
  const handleCancel = () => setIsFormOpen(false);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8 md:pb-20">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">مدیریت بدهی‌ها</h1>
        <Button onClick={handleAddNew} className='hidden md:inline-flex'><PlusCircle className="ml-2 h-4 w-4" />ثبت بدهی جدید</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
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
                debtPayments={debtPayments || []} // Pass debt payments
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
      <Button onClick={handleAddNew} className="md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-20" size="icon" aria-label="ثبت بدهی جدید">
        <Plus className="h-6 w-6" />
      </Button>
    </main>
  );
}
