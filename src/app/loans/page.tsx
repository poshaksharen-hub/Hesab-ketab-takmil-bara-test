
'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import {
  doc,
  runTransaction,
  collection,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import type { Loan, BankAccount, Category, TransactionDetails, LoanPayment, Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { LoanList } from '@/components/loans/loan-list';
import { LoanForm } from '@/components/loans/loan-form';
import { LoanPaymentDialog } from '@/components/loans/loan-payment-dialog';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatCurrency } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendSystemNotification } from '@/lib/notifications';
import { errorEmitter } from '@/firebase/error-emitter';
import { USER_DETAILS } from '@/lib/constants';


const FAMILY_DATA_DOC = 'shared-data';

export default function LoansPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
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
    if (!user || !firestore || !users || !bankAccounts || !payees) {
        toast({
            title: 'خطای سیستمی',
            description: 'سرویس‌های مورد نیاز بارگذاری نشده‌اند. لطفا صفحه را رفرش کنید.',
            variant: 'destructive',
        });
        return;
    }

    const { registeredByUserId, ...loanValues } = values;

    if (editingLoan) {
        // --- EDIT LOGIC ---
        runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const loanRef = doc(familyDataRef, 'loans', editingLoan.id);
            const loanDoc = await transaction.get(loanRef);
            if (!loanDoc.exists()) throw new Error('این وام برای ویرایش یافت نشد.');

            const oldLoanData = loanDoc.data() as Loan;
            const amountDifference = loanValues.amount - oldLoanData.amount;
            
            const newRemainingAmount = oldLoanData.remainingAmount + amountDifference;
            if (newRemainingAmount < 0) throw new Error('مبلغ جدید وام نمی‌تواند کمتر از مبلغ پرداخت شده باشد.');
            
            if (oldLoanData.depositToAccountId && amountDifference !== 0) {
                const accountRef = doc(familyDataRef, 'bankAccounts', oldLoanData.depositToAccountId);
                const accountDoc = await transaction.get(accountRef);
                if (accountDoc.exists()) {
                    const accountData = accountDoc.data() as BankAccount;
                    transaction.update(accountRef, { balance: accountData.balance + amountDifference });
                }
            }

            const updateData = { 
                ...loanValues,
                ownerId: oldLoanData.ownerId, 
                remainingAmount: newRemainingAmount,
            };
            transaction.update(loanRef, updateData);
        }).then(() => {
            toast({ title: 'موفقیت', description: `وام با موفقیت ویرایش شد.` });
            setIsFormOpen(false);
            setEditingLoan(null);
        }).catch((error: any) => {
            if (error.name === 'FirebaseError') {
                 const permissionError = new FirestorePermissionError({
                    path: `family-data/${FAMILY_DATA_DOC}/loans/${editingLoan.id}`,
                    operation: 'update',
                    requestResourceData: loanValues,
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({ variant: 'destructive', title: `خطا در ویرایش وام`, description: error.message || 'مشکلی در ثبت اطلاعات پیش آمد.' });
            }
        });
    } else {
        // --- CREATE LOGIC ---
        try {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const newLoanRef = doc(collection(familyDataRef, 'loans'));
            const loanData: Loan = { 
                id: newLoanRef.id,
                ...loanValues,
                registeredByUserId: user.uid,
                paidInstallments: 0, 
                remainingAmount: loanValues.amount 
            };
            
            const promises = [setDoc(newLoanRef, loanData)];

            if (loanData.depositOnCreate && loanData.depositToAccountId) {
                const bankAccountRef = doc(familyDataRef, 'bankAccounts', loanData.depositToAccountId);
                const bankAccountDoc = await getDoc(bankAccountRef);
                if (!bankAccountDoc.exists()) throw new Error('حساب بانکی انتخاب شده برای واریز یافت نشد.');
                
                const bankAccountData = bankAccountDoc.data() as BankAccount;
                const balanceAfter = bankAccountData.balance + loanData.amount;
                promises.push(updateDoc(bankAccountRef, { balance: balanceAfter }));
            }
            
            await Promise.all(promises);

            toast({ title: 'موفقیت', description: `وام با موفقیت ثبت شد.` });
            setIsFormOpen(false);
            setEditingLoan(null);

             const payeeName = payees.find(p => p.id === loanValues.payeeId)?.name;
             const bankAccount = bankAccounts.find(b => b.id === loanValues.depositToAccountId);
             const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
             
             const notificationDetails: TransactionDetails = { type: 'loan', title: `ثبت وام جدید: ${loanValues.title}`, amount: loanValues.amount, date: loanValues.startDate, icon: 'Landmark', color: 'rgb(139 92 246)', registeredBy: currentUserFirstName, payee: payeeName, properties: [{ label: 'واریز به', value: loanValues.depositOnCreate && bankAccount ? bankAccount.bankName : 'ثبت بدون واریز' }] };
             await sendSystemNotification(firestore, user.uid, notificationDetails);

        } catch (error: any) {
            if (error.name === 'FirebaseError') {
                 const permissionError = new FirestorePermissionError({
                    path: `family-data/${FAMILY_DATA_DOC}/loans`,
                    operation: 'create',
                    requestResourceData: loanValues,
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({ variant: 'destructive', title: `خطا در ثبت وام`, description: error.message || 'مشکلی در ثبت اطلاعات پیش آمد.' });
            }
        }
    }
  }, [user, firestore, editingLoan, bankAccounts, payees, users, toast]);


  const handlePayInstallment = useCallback(async ({ loan, paymentBankAccountId, installmentAmount }: { loan: Loan, paymentBankAccountId: string, installmentAmount: number }) => {
    if (!user || !firestore || !bankAccounts || !categories || !payees || !users) return;

    if (installmentAmount <= 0) {
        toast({ variant: "destructive", title: "خطا", description: "مبلغ قسط باید بیشتر از صفر باشد."});
        return;
    }
    
    runTransaction(firestore, async (transaction) => {
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

        const paymentRef = doc(collection(familyDataRef, 'loanPayments'));
        const expenseRef = doc(collection(familyDataRef, 'expenses'));
        const expenseCategory = categories?.find(c => c.name.includes('قسط')) || categories?.[0];

        transaction.update(accountToPayFromRef, { balance: balanceAfter });
        transaction.update(loanRef, { paidInstallments: newPaidInstallments, remainingAmount: newRemainingAmount });
        transaction.set(paymentRef, { id: paymentRef.id, loanId: loan.id, bankAccountId: paymentBankAccountId, amount: installmentAmount, paymentDate: new Date().toISOString(), registeredByUserId: user.uid });
        transaction.set(expenseRef, { id: expenseRef.id, ownerId: accountData.ownerId, registeredByUserId: user.uid, amount: installmentAmount, bankAccountId: paymentBankAccountId, categoryId: expenseCategory?.id || 'uncategorized', date: new Date().toISOString(), description: `پرداخت قسط وام: ${loan.title}`, type: 'expense', subType: 'loan_payment', expenseFor: loan.ownerId, loanPaymentId: paymentRef.id, createdAt: serverTimestamp(), balanceBefore: balanceBefore, balanceAfter: balanceAfter });
    }).then(async () => {
        toast({ title: "موفقیت", description: "قسط با موفقیت پرداخت و به عنوان هزینه ثبت شد." });
        setPayingLoan(null);
        
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const bankAccount = bankAccounts.find(b => b.id === paymentBankAccountId);
        const notificationDetails: TransactionDetails = { type: 'payment', title: `پرداخت قسط وام: ${loan.title}`, amount: installmentAmount, date: new Date().toISOString(), icon: 'CheckCircle', color: 'rgb(22 163 74)', registeredBy: currentUserFirstName, payee: payees.find(p => p.id === loan.payeeId)?.name, properties: [{ label: 'از حساب', value: bankAccount?.bankName }] };
        await sendSystemNotification(firestore, user.uid, notificationDetails);
    }).catch((error: any) => {
        if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({
                path: `family-data/${FAMILY_DATA_DOC}/loans/${loan.id}`,
                operation: 'write',
                requestResourceData: { loanId: loan.id, paymentBankAccountId, installmentAmount },
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
             toast({ variant: "destructive", title: "خطا در پرداخت قسط", description: error.message });
        }
    });
  }, [user, firestore, bankAccounts, categories, payees, users, toast]);

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
    const loanRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'loans', loanId);

    try {
        if (loanToDelete.depositToAccountId) {
            const depositAccountRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'bankAccounts', loanToDelete.depositToAccountId);
            const depositAccountDoc = await getDoc(depositAccountRef);
            if (depositAccountDoc.exists()) {
                const accountData = depositAccountDoc.data() as BankAccount;
                await updateDoc(depositAccountRef, { balance: accountData.balance - loanToDelete.amount });
            } else {
                console.warn(`Cannot reverse loan deposit: Account ${loanToDelete.depositToAccountId} not found. The deletion will proceed without reversing the initial deposit.`);
            }
        }
        await deleteDoc(loanRef);
        toast({ title: "موفقیت", description: "وام با موفقیت حذف شد." });
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({ path: loanRef.path, operation: 'delete' });
             errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: "destructive", title: "خطا در حذف وام", description: error.message || "مشکلی در حذف وام پیش آمد." });
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
        <div className="hidden md:block">
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                ثبت وام جدید
            </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        </div>
      ) : (
        <>
            <LoanForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                onSubmit={handleFormSubmit}
                initialData={editingLoan}
                bankAccounts={bankAccounts || []}
                payees={payees || []}
                user={user}
            />
            <LoanList
                loans={loans || []}
                payees={payees || []}
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
      
      {/* Floating Action Button for Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
          <Button
            onClick={handleAddNew}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            aria-label="ثبت وام جدید"
          >
            <Plus className="h-6 w-6" />
          </Button>
      </div>
    </div>
  );
}

    