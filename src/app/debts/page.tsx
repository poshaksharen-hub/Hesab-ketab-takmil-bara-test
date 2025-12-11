
'use client';
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import type { PreviousDebt, BankAccount, Category, Payee, Expense, UserProfile, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatCurrency } from '@/lib/utils';
import { DebtList } from '@/components/debts/debt-list';
import { DebtForm } from '@/components/debts/debt-form';
import { PayDebtDialog } from '@/components/debts/pay-debt-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { USER_DETAILS } from '@/lib/constants';
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
    users, // Though not directly used, we get it from the hook
  } = allData;

 const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore) {
        toast({ title: "خطا", description: "برای ثبت بدهی باید ابتدا وارد شوید.", variant: "destructive" });
        return;
    };

    const debtData: Omit<PreviousDebt, 'id'> = {
        ...values,
        registeredByUserId: user.uid,
        remainingAmount: values.amount,
        paidInstallments: 0,
    };

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const newDebtRef = doc(collection(familyDataRef, 'previousDebts'));
            transaction.set(newDebtRef, { ...debtData, id: newDebtRef.id });
        });

        toast({ title: 'موفقیت', description: 'بدهی جدید با موفقیت ثبت شد.' });
        setIsFormOpen(false);

        const payeeName = payees.find(p => p.id === values.payeeId)?.name;
        const currentUserFirstName = user.uid === USER_DETAILS.ali.id ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName;
        
        const notificationDetails: TransactionDetails = {
            type: 'debt',
            title: `ثبت بدهی جدید به ${payeeName}`,
            amount: values.amount,
            date: debtData.startDate!,
            icon: 'Handshake',
            color: 'rgb(99 102 241)',
            registeredBy: currentUserFirstName,
            payee: payeeName,
            properties: [
                { label: 'شرح', value: values.description },
                { label: 'نوع', value: values.isInstallment ? 'قسطی' : 'یکجا' },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);

    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({
                path: `family-data/${FAMILY_DATA_DOC}/previousDebts`,
                operation: 'create',
                requestResourceData: debtData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: 'destructive',
                title: 'خطا در ثبت بدهی',
                description: error.message,
            });
        }
    }
  }, [user, firestore, toast, payees]);


  const handlePayDebt = useCallback(async ({ debt, paymentBankAccountId, amount }: { debt: PreviousDebt, paymentBankAccountId: string, amount: number }) => {
    if (!user || !firestore || !categories || !bankAccounts || !payees) return;

    if (amount <= 0) {
        toast({ variant: "destructive", title: "خطا", description: "مبلغ پرداختی باید بیشتر از صفر باشد."});
        return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
        const debtRef = doc(familyDataRef, 'previousDebts', debt.id);
        const accountToPayFromRef = doc(familyDataRef, 'bankAccounts', paymentBankAccountId);
        
        const debtDoc = await transaction.get(debtRef);
        const accountToPayFromDoc = await transaction.get(accountToPayFromRef);

        if (!debtDoc.exists()) throw new Error("بدهی مورد نظر یافت نشد.");
        if (!accountToPayFromDoc.exists()) throw new Error("کارت بانکی پرداخت یافت نشد.");

        const currentDebtData = debtDoc.data() as PreviousDebt;
        const accountData = accountToPayFromDoc.data() as BankAccount;
        const availableBalance = accountData.balance - (accountData.blockedBalance || 0);

        if (amount > currentDebtData.remainingAmount) {
            throw new Error(`مبلغ پرداختی (${formatCurrency(amount, 'IRT')}) نمی‌تواند از مبلغ باقی‌مانده بدهی (${formatCurrency(currentDebtData.remainingAmount, 'IRT')}) بیشتر باشد.`);
        }

        if (availableBalance < amount) {
            throw new Error("موجودی حساب برای پرداخت کافی نیست.");
        }
        
        const newRemainingAmount = currentDebtData.remainingAmount - amount;
        const newPaidInstallments = (currentDebtData.paidInstallments || 0) + 1;
        const balanceBefore = accountData.balance;
        const balanceAfter = balanceBefore - amount;
        
        const expenseCategory = categories.find(c => c.name.includes('بدهی')) || categories[0];
        
        transaction.update(debtRef, { 
            remainingAmount: newRemainingAmount,
            paidInstallments: newPaidInstallments
        });
        
        transaction.update(accountToPayFromRef, { balance: balanceAfter });

        const newPaymentRef = doc(collection(familyDataRef, 'debtPayments'));
        transaction.set(newPaymentRef, {
            id: newPaymentRef.id,
            debtId: debt.id,
            bankAccountId: paymentBankAccountId,
            amount: amount,
            paymentDate: new Date().toISOString(),
            registeredByUserId: user.uid,
        });
        
        const newExpenseRef = doc(collection(familyDataRef, 'expenses'));
        transaction.set(newExpenseRef, {
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
        });
      });
      toast({ title: "موفقیت", description: "پرداخت با موفقیت ثبت و به عنوان هزینه در سیستم منظور شد." });
      setPayingDebt(null);

       const payeeName = payees.find(p => p.id === debt.payeeId)?.name;
       const bankAccount = bankAccounts.find(b => b.id === paymentBankAccountId);
       const currentUserFirstName = user.uid === USER_DETAILS.ali.id ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName;
       
       const notificationDetails: TransactionDetails = {
            type: 'payment',
            title: `پرداخت بدهی به ${payeeName}`,
            amount: amount,
            date: new Date().toISOString(),
            icon: 'CheckCircle',
            color: 'rgb(22 163 74)',
            registeredBy: currentUserFirstName,
            payee: payeeName,
            properties: [
                { label: 'شرح', value: debt.description },
                { label: 'از حساب', value: bankAccount?.bankName },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);

    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({
                path: `family-data/shared-data/previousDebts/${debt.id}`,
                operation: 'write'
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: 'destructive',
                title: 'خطا در پرداخت بدهی',
                description: error.message,
            });
        }
    }
  }, [user, firestore, categories, bankAccounts, toast, payees]);

  const handleDeleteDebt = useCallback(async (debtId: string) => {
    if (!user || !firestore || !previousDebts) return;

    const debtToDelete = previousDebts.find(d => d.id === debtId);
    if (!debtToDelete) {
        toast({ variant: 'destructive', title: 'خطا', description: 'بدهی مورد نظر یافت نشد.'});
        return;
    }
    
    if (debtToDelete.paidInstallments > 0) {
        toast({ variant: 'destructive', title: 'امکان حذف وجود ندارد', description: 'این بدهی دارای سابقه پرداخت است. برای حذف، ابتدا باید تمام پرداخت‌های مرتبط را به صورت دستی برگردانید.'});
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const debtRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'previousDebts', debtId);
            transaction.delete(debtRef);
        });
        toast({ title: "موفقیت", description: "بدهی با موفقیت حذف شد." });
    } catch(error: any) {
        if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({ path: `family-data/shared-data/previousDebts/${debtId}`, operation: 'delete'});
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: "destructive", title: "خطا در حذف", description: error.message || "مشکلی در حذف بدهی پیش آمد." });
        }
    }
  }, [user, firestore, previousDebts, toast]);

  const handleAddNew = () => setIsFormOpen(true);
  const handleCancel = () => setIsFormOpen(false);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8 md:pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
        />
      ) : (
        <>
            <DebtList
                debts={previousDebts || []}
                payees={payees || []}
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
