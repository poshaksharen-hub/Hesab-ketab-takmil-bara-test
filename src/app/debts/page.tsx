
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
  writeBatch,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import type { PreviousDebt, BankAccount, Category, Payee, Expense, UserProfile, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    previousDebts,
    bankAccounts,
    categories,
    payees,
    users,
  } = allData;

 const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore || !users) {
        toast({ title: "خطا", description: "برای ثبت بدهی باید ابتدا وارد شوید.", variant: "destructive" });
        return;
    };
    setIsSubmitting(true);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const newDebtRef = doc(collection(familyDataRef, 'previousDebts'));
            
            const debtData: Omit<PreviousDebt, 'id'> = {
                ...values,
                id: newDebtRef.id,
                registeredByUserId: user.uid,
                remainingAmount: values.amount,
                paidInstallments: 0,
                startDate: (values.startDate as Date).toISOString(),
                ...(values.isInstallment && values.firstInstallmentDate ? { firstInstallmentDate: (values.firstInstallmentDate as Date).toISOString() } : {}),
                ...(!values.isInstallment && values.dueDate ? { dueDate: (values.dueDate as Date).toISOString() } : {}),
            };

            // Clean up undefined date fields to prevent Firestore errors
            if (values.isInstallment) {
                delete (debtData as any).dueDate;
            } else {
                delete (debtData as any).firstInstallmentDate;
            }
            
            transaction.set(newDebtRef, debtData);
        });
        
        toast({ title: 'موفقیت', description: 'بدهی جدید با موفقیت ثبت شد.' });
        setIsFormOpen(false);

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
            expenseFor: USER_DETAILS[values.ownerId as 'ali' | 'fatemeh']?.firstName || 'مشترک',
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
        await sendSystemNotification(firestore, user.uid, notificationDetails);

    } catch (error: any) {
        console.error("Error in handleFormSubmit:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `family-data/${FAMILY_DATA_DOC}/previousDebts`,
            operation: 'create',
        }));
        toast({
            variant: 'destructive',
            title: 'خطا در ثبت بدهی',
            description: error.message || 'یک خطای ناشناخته در هنگام ثبت بدهی رخ داد.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, firestore, toast, payees, users]);


  const handlePayDebt = useCallback(async ({ debt, paymentBankAccountId, amount }: { debt: PreviousDebt, paymentBankAccountId: string, amount: number }) => {
    if (!user || !firestore || !categories || !bankAccounts || !payees || !users) return;

    if (amount <= 0) {
        toast({ variant: "destructive", title: "خطا", description: "مبلغ پرداختی باید بیشتر از صفر باشد."});
        return;
    }
    setIsSubmitting(true);
    
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
            expenseFor: USER_DETAILS[debt.ownerId as 'ali' | 'fatemeh']?.firstName || 'مشترک',
            bankAccount: { name: bankAccount?.name || 'نامشخص', owner: accountOwner || 'نامشخص' },
            properties: [
                { label: 'شرح', value: debt.description },
                { label: 'مبلغ باقی‌مانده', value: formatCurrency(debt.remainingAmount - amount, 'IRT') },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);
    
    } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `family-data/${FAMILY_DATA_DOC}/previousDebts/${debt.id}`,
            operation: 'write'
        }));
        toast({
            variant: 'destructive',
            title: 'خطا در پرداخت بدهی',
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, firestore, categories, bankAccounts, toast, payees, users]);

  const handleDeleteDebt = useCallback(async (debtId: string) => {
    if (!user || !firestore || !previousDebts) return;
    
    setIsSubmitting(true);
    const debtToDelete = previousDebts.find(d => d.id === debtId);
    if (!debtToDelete) {
        toast({ variant: "destructive", title: "خطا", description: "بدهی مورد نظر برای حذف یافت نشد." });
        setIsSubmitting(false);
        return;
    }
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDocRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            
            // Check for related payments
            const paymentsQuery = query(collection(familyDocRef, 'debtPayments'), where('debtId', '==', debtId));
            // This is a read operation within a transaction, which is allowed.
            const paymentsSnapshot = await getDocs(paymentsQuery);

            if (!paymentsSnapshot.empty) {
                throw new Error('این بدهی دارای سابقه پرداخت است. برای حذف، ابتدا باید تمام پرداخت‌های مرتبط را به صورت دستی برگردانید.');
            }
            
            const debtRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'previousDebts', debtId);
            transaction.delete(debtRef);
        });

        toast({ title: "موفقیت", description: "بدهی با موفقیت حذف شد." });
    } catch (error: any) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `family-data/${FAMILY_DATA_DOC}/previousDebts/${debtId}`,
            operation: 'delete'
         }));
         toast({ variant: "destructive", title: "خطا در حذف", description: error.message || "مشکلی در حذف بدهی پیش آمد." });
    } finally {
        setIsSubmitting(false);
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
