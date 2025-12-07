
'use client';
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  serverTimestamp,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import type { PreviousDebt, BankAccount, Category, Payee, Expense, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatCurrency } from '@/lib/utils';
import { DebtList } from '@/components/debts/debt-list';
import { DebtForm } from '@/components/debts/debt-form';
import { PayDebtDialog } from '@/components/debts/pay-debt-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const FAMILY_DATA_DOC = 'shared-data';

export default function DebtsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState<PreviousDebt | null>(null);

  const { 
    previousDebts,
    bankAccounts,
    categories,
    payees,
    users,
    debtPayments,
  } = allData;

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore) return;

    const debtData = {
        ...values,
        registeredByUserId: user.uid,
        remainingAmount: values.amount,
    };

    const newDebtRef = collection(doc(firestore, 'family-data', FAMILY_DATA_DOC), 'previousDebts');
    
    addDoc(newDebtRef, debtData)
        .then(docRef => {
            updateDoc(docRef, { id: docRef.id });
            toast({ title: 'موفقیت', description: 'بدهی جدید با موفقیت ثبت شد.' });
            setIsFormOpen(false);
        })
        .catch(error => {
            const permissionError = new FirestorePermissionError({
                path: newDebtRef.path,
                operation: 'create',
                requestResourceData: debtData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

  }, [user, firestore, toast]);

  const handlePayDebt = useCallback(async ({ debt, paymentBankAccountId, amount }: { debt: PreviousDebt, paymentBankAccountId: string, amount: number }) => {
    if (!user || !firestore || !categories || !bankAccounts) return;

    if (amount <= 0) {
        toast({ variant: "destructive", title: "خطا", description: "مبلغ پرداختی باید بیشتر از صفر باشد."});
        return;
    }

    const debtRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'previousDebts', debt.id);
    const accountToPayFromRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'bankAccounts', paymentBankAccountId);
    
    const accountData = bankAccounts.find(acc => acc.id === paymentBankAccountId);
    if (!accountData) {
        toast({ variant: 'destructive', title: 'خطا', description: 'حساب بانکی پرداخت یافت نشد.'});
        return;
    }

    if (amount > debt.remainingAmount) {
        toast({ variant: 'destructive', title: 'خطا', description: `مبلغ پرداختی (${formatCurrency(amount, 'IRT')}) نمی‌تواند از مبلغ باقی‌مانده بدهی (${formatCurrency(debt.remainingAmount, 'IRT')}) بیشتر باشد.`});
        return;
    }

    if (accountData.balance < amount) {
        toast({ variant: 'destructive', title: 'خطا', description: 'موجودی حساب برای پرداخت کافی نیست.'});
        return;
    }
    
    const newRemainingAmount = debt.remainingAmount - amount;
    const balanceBefore = accountData.balance;
    const balanceAfter = balanceBefore - amount;
    
    const expenseCategory = categories.find(c => c.name.includes('بدهی')) || categories[0];
    const newPaymentRef = doc(collection(doc(firestore, 'family-data', FAMILY_DATA_DOC), 'debtPayments'));
    const newExpenseRef = doc(collection(doc(firestore, 'family-data', FAMILY_DATA_DOC), 'expenses'));

    // Optimistic UI updates can happen here if needed

    // Update debt
    updateDoc(debtRef, { remainingAmount: newRemainingAmount }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: debtRef.path, operation: 'update', requestResourceData: { remainingAmount: newRemainingAmount } }));
    });
    
    // Update account balance
    updateDoc(accountToPayFromRef, { balance: balanceAfter }).catch(error => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: accountToPayFromRef.path, operation: 'update', requestResourceData: { balance: balanceAfter } }));
    });

    // Create payment record
    const paymentData = {
        id: newPaymentRef.id,
        debtId: debt.id,
        bankAccountId: paymentBankAccountId,
        amount: amount,
        paymentDate: new Date().toISOString(),
        registeredByUserId: user.uid,
    };
    updateDoc(newPaymentRef, paymentData).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: newPaymentRef.path, operation: 'create', requestResourceData: paymentData }));
    });
    
    // Create expense record
    const expenseData = {
        id: newExpenseRef.id,
        ownerId: accountData.ownerId,
        registeredByUserId: user.uid,
        amount: amount,
        bankAccountId: paymentBankAccountId,
        categoryId: expenseCategory?.id || 'uncategorized',
        payeeId: debt.payeeId,
        date: new Date().toISOString(),
        description: `پرداخت بدهی: ${debt.description}`,
        type: 'expense' as const,
        subType: 'debt_payment' as const,
        debtPaymentId: newPaymentRef.id,
        expenseFor: debt.ownerId,
        createdAt: serverTimestamp(),
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
    };
     updateDoc(newExpenseRef, expenseData).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: newExpenseRef.path, operation: 'create', requestResourceData: expenseData }));
    });

    toast({ title: "موفقیت", description: "پرداخت با موفقیت ثبت و به عنوان هزینه در سیستم منظور شد." });
    setPayingDebt(null);

  }, [user, firestore, categories, bankAccounts, toast]);

  const handleDeleteDebt = useCallback(async (debtId: string) => {
    if (!user || !firestore || !previousDebts || !debtPayments) return;

    const debtToDelete = previousDebts.find(d => d.id === debtId);
    if (!debtToDelete) {
        toast({ variant: 'destructive', title: 'خطا', description: 'بدهی مورد نظر یافت نشد.'});
        return;
    }
    
    const hasPayments = debtPayments.some(p => p.debtId === debtId);
    if (hasPayments) {
        toast({ variant: 'destructive', title: 'امکان حذف وجود ندارد', description: 'این بدهی دارای سابقه پرداخت است. برای حذف، ابتدا باید تمام پرداخت‌های مرتبط را به صورت دستی برگردانید.'});
        return;
    }

    const debtRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'previousDebts', debtId);
    updateDoc(debtRef, { id: debtRef.id }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: debtRef.path, operation: 'delete'}));
        toast({ variant: 'destructive', title: 'خطا در حذف', description: 'مشکلی در حذف بدهی پیش آمد.'});
    }).then(() => {
        toast({ title: "موفقیت", description: "بدهی با موفقیت حذف شد." });
    });

  }, [user, firestore, previousDebts, debtPayments, toast]);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">مدیریت بدهی‌ها</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="ml-2 h-4 w-4" />
          ثبت بدهی جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : isFormOpen ? (
        <DebtForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          payees={payees || []}
        />
      ) : (
        <>
            <DebtList
                debts={previousDebts || []}
                payees={payees || []}
                users={users || []}
                onPay={setPayingDebt}
                onDelete={handleDeleteDebt}
            />
            {payingDebt && (
                <PayDebtDialog
                    debt={payingDebt}
                    bankAccounts={bankAccounts || []}
                    isOpen={!!payingDebt}
                    onOpenChange={() => setPayingDebt(null)}
                    onSubmit={handlePayDebt}
                />
            )}
        </>
      )}
    </main>
  );
}
