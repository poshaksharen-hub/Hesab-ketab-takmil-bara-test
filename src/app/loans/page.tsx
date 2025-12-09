
'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, addDoc, serverTimestamp, query, where, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import type { Loan, LoanPayment, BankAccount, Category, Payee, OwnerId, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { LoanList } from '@/components/loans/loan-list';
import { LoanForm } from '@/components/loans/loan-form';
import { LoanPaymentDialog } from '@/components/loans/loan-payment-dialog';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatCurrency } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { USER_DETAILS } from '@/lib/constants';

const FAMILY_DATA_DOC = 'shared-data';

export default function LoansPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);

  const { 
    loans,
    bankAccounts,
    categories,
    payees,
    users,
  } = allData;

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore || !users) return;

    const {
        title,
        amount,
        installmentAmount,
        numberOfInstallments,
        startDate,
        firstInstallmentDate,
        payeeId,
        ownerId, // This now correctly represents the beneficiary
        depositOnCreate,
        depositToAccountId,
    } = values;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            
            const loanData: Omit<Loan, 'id' | 'registeredByUserId' | 'paidInstallments' | 'remainingAmount' > = {
                title,
                amount,
                ownerId, // Use the ownerId directly from the form
                installmentAmount: installmentAmount || 0,
                numberOfInstallments: numberOfInstallments || 0,
                startDate: startDate,
                firstInstallmentDate: firstInstallmentDate,
                payeeId: payeeId || undefined,
                depositToAccountId: (depositOnCreate && depositToAccountId) ? depositToAccountId : undefined,
            };

            const newLoanRef = doc(collection(familyDataRef, 'loans'));
            transaction.set(newLoanRef, {
                ...loanData,
                id: newLoanRef.id,
                registeredByUserId: user.uid,
                paidInstallments: 0,
                remainingAmount: loanData.amount,
            });

            if (depositOnCreate && depositToAccountId) {
                const bankAccountRef = doc(familyDataRef, 'bankAccounts', depositToAccountId);
                const bankAccountDoc = await transaction.get(bankAccountRef);

                if (!bankAccountDoc.exists()) {
                    throw new Error('حساب بانکی انتخاب شده برای واریز یافت نشد.');
                }
                const bankAccountData = bankAccountDoc.data() as BankAccount;
                const balanceAfter = bankAccountData.balance + loanData.amount;
                transaction.update(bankAccountRef, { balance: balanceAfter });
            }
        });

        toast({ title: 'موفقیت', description: 'وام جدید با موفقیت ثبت شد.' });
        setIsFormOpen(false);
        setEditingLoan(null);

        const payeeName = payees.find(p => p.id === payeeId)?.name;
        const bankAccount = bankAccounts.find(b => b.id === depositToAccountId);
        const currentUser = users.find(u => u.id === user.uid);
        const notificationDetails: TransactionDetails = {
            type: 'loan',
            title: `ثبت وام جدید: ${title}`,
            amount: amount,
            date: startDate,
            icon: 'Landmark',
            color: 'rgb(139 92 246)',
            registeredBy: currentUser?.firstName || 'کاربر',
            payee: payeeName,
            properties: [
                { label: 'واریز به', value: depositOnCreate && bankAccount ? bankAccount.bankName : 'ثبت بدون واریز' },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);

    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             throw new FirestorePermissionError({
                path: 'family-data/shared-data/loans',
                operation: 'create',
                requestResourceData: values,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'خطا در ثبت وام',
                description: error.message || 'مشکلی در ثبت اطلاعات پیش آمد.',
            });
        }
    }
}, [user, firestore, toast, payees, bankAccounts, users]);


  const handlePayInstallment = useCallback(async ({ loan, paymentBankAccountId, installmentAmount }: { loan: Loan, paymentBankAccountId: string, installmentAmount: number }) => {
    if (!user || !firestore || !bankAccounts || !categories || !users || !payees) return;

    if (installmentAmount <= 0) {
        toast({ variant: "destructive", title: "خطا", description: "مبلغ قسط باید بیشتر از صفر باشد."});
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const loanRef = doc(familyDataRef, 'loans', loan.id);
            const accountToPayFromRef = doc(familyDataRef, 'bankAccounts', paymentBankAccountId);
            
            const loanDoc = await transaction.get(loanRef);
            const accountToPayFromDoc = await transaction.get(accountToPayFromRef);

            if (!loanDoc.exists()) throw new Error("وام مورد نظر یافت نشد.");
            if (!accountToPayFromDoc.exists()) throw new Error("کارت بانکی پرداخت یافت نشد.");
            
            const currentLoanData = loanDoc.data() as Loan;
            const accountData = accountToPayFromDoc.data() as BankAccount;
            const availableBalance = accountData.balance - (accountData.blockedBalance || 0);

            if (installmentAmount > currentLoanData.remainingAmount) {
                throw new Error(`مبلغ پرداختی (${formatCurrency(installmentAmount, 'IRT')}) نمی‌تواند از مبلغ باقی‌مانده وام (${formatCurrency(currentLoanData.remainingAmount, 'IRT')}) بیشتر باشد.`);
            }

            if (availableBalance < installmentAmount) {
                throw new Error("موجودی حساب برای پرداخت قسط کافی نیست.");
            }

            const balanceBefore = accountData.balance;
            const balanceAfter = balanceBefore - installmentAmount;
            const newPaidInstallments = currentLoanData.paidInstallments + 1;
            const newRemainingAmount = currentLoanData.remainingAmount - installmentAmount;

            transaction.update(accountToPayFromRef, { balance: balanceAfter });

            transaction.update(loanRef, {
                paidInstallments: newPaidInstallments,
                remainingAmount: newRemainingAmount,
            });

            const paymentRef = doc(collection(familyDataRef, 'loanPayments'));
            transaction.set(paymentRef, {
                id: paymentRef.id,
                loanId: loan.id,
                bankAccountId: paymentBankAccountId,
                amount: installmentAmount,
                paymentDate: new Date().toISOString(),
                registeredByUserId: user.uid,
            });

            const expenseRef = doc(collection(familyDataRef, 'expenses'));
            const expenseCategory = categories?.find(c => c.name.includes('قسط')) || categories?.[0];
            transaction.set(expenseRef, {
                id: expenseRef.id,
                ownerId: accountData.ownerId,
                registeredByUserId: user.uid,
                amount: installmentAmount,
                bankAccountId: paymentBankAccountId,
                categoryId: expenseCategory?.id || 'uncategorized',
                date: new Date().toISOString(),
                description: `پرداخت قسط وام: ${loan.title}`,
                type: 'expense',
                subType: 'loan_payment',
                expenseFor: loan.ownerId, // Use the beneficiary from the loan itself
                loanPaymentId: paymentRef.id,
                createdAt: serverTimestamp(),
                balanceBefore: balanceBefore,
                balanceAfter: balanceAfter,
            });
        });
        toast({ title: "موفقیت", description: "قسط با موفقیت پرداخت و به عنوان هزینه ثبت شد." });
        setPayingLoan(null);

        const bankAccount = bankAccounts.find(b => b.id === paymentBankAccountId);
        const currentUser = users.find(u => u.id === user.uid);
        const notificationDetails: TransactionDetails = {
            type: 'payment',
            title: `پرداخت قسط وام: ${loan.title}`,
            amount: installmentAmount,
            date: new Date().toISOString(),
            icon: 'CheckCircle',
            color: 'rgb(22 163 74)',
            registeredBy: currentUser?.firstName || 'کاربر',
            payee: payees.find(p => p.id === loan.payeeId)?.name,
            properties: [
                { label: 'از حساب', value: bankAccount?.bankName },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در پرداخت قسط",
            description: error.message,
        });
    }
  }, [user, firestore, bankAccounts, categories, toast, users, payees]);

  const handleDelete = useCallback(async (loanId: string) => {
    if (!user || !firestore || !loans) return;

    const loanToDelete = loans.find(l => l.id === loanId);
    if (!loanToDelete) {
        toast({ variant: 'destructive', title: 'خطا', description: 'وام مورد نظر یافت نشد.' });
        return;
    }
    
    if (loanToDelete.paidInstallments > 0) {
        toast({ variant: 'destructive', title: 'امکان حذف وجود ندارد', description: 'این وام دارای سابقه پرداخت است. برای حذف، ابتدا باید تمام پرداخت‌ها را به صورت دستی برگردانید و سپس وام را حذف کنید.' });
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const loanRef = doc(familyDataRef, 'loans', loanId);

            // Reverse the initial deposit if it was made
            if (loanToDelete.depositToAccountId) {
                const depositAccountRef = doc(familyDataRef, 'bankAccounts', loanToDelete.depositToAccountId);
                const depositAccountDoc = await transaction.get(depositAccountRef);
                if (depositAccountDoc.exists()) {
                    const accountData = depositAccountDoc.data() as BankAccount;
                    transaction.update(depositAccountRef, { balance: accountData.balance - loanToDelete.amount });
                } else {
                    console.warn(`Cannot reverse loan deposit: Account ${loanToDelete.depositToAccountId} not found. The deletion will proceed without reversing the initial deposit.`);
                }
            }
            
            transaction.delete(loanRef);
        });

        toast({ title: "موفقیت", description: "وام با موفقیت حذف شد." });

    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             throw new FirestorePermissionError({
                path: `family-data/shared-data/loans/${loanId}`,
                operation: 'delete'
            });
        } else {
            toast({
                variant: "destructive",
                title: "خطا در حذف وام",
                description: error.message || "مشکلی در حذف وام پیش آمد.",
            });
        }
    }
}, [user, firestore, loans, toast]);


  const handleAddNew = () => {
    setEditingLoan(null);
    setIsFormOpen(true);
  };

  const handleEdit = useCallback((loan: Loan) => {
    setEditingLoan(loan);
    setIsFormOpen(true);
  }, []);
  
  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingLoan(null);
  };

  
  const isLoading = isUserLoading || isDashboardLoading;
  
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8 md:pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/">
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="font-headline text-3xl font-bold tracking-tight">مدیریت وام‌ها</h1>
        </div>
        {!isFormOpen && (
            <Button onClick={handleAddNew} className="hidden md:inline-flex">
                <PlusCircle className="ml-2 h-4 w-4" />
                ثبت وام جدید
            </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        </div>
      ) : isFormOpen ? (
        <LoanForm
            onCancel={handleCancel}
            onSubmit={handleFormSubmit}
            initialData={editingLoan}
            bankAccounts={bankAccounts || []}
            payees={payees || []}
        />
      ) : (
        <>
            <LoanList
                loans={loans || []}
                payees={payees || []}
                bankAccounts={bankAccounts || []}
                users={users || []}
                onDelete={handleDelete}
                onPay={setPayingLoan}
                onEdit={handleEdit}
            />
            {payingLoan && (
                <LoanPaymentDialog
                    loan={payingLoan}
                    bankAccounts={bankAccounts || []}
                    isOpen={!!payingLoan}
                    onOpenChange={() => setPayingLoan(null)}
                    onSubmit={handlePayInstallment}
                />
            )}
        </>
      )}
       {!isFormOpen && (
        <Button
          onClick={handleAddNew}
          className="md:hidden fixed bottom-20 left-4 h-14 w-14 rounded-full shadow-lg z-20"
          size="icon"
          aria-label="ثبت وام جدید"
        >
          <PlusCircle className="h-6 w-6" />
        </Button>
      )}
    </main>
  );
}
