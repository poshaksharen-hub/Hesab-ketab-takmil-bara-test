

'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, addDoc, serverTimestamp, query, where, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import type { Loan, LoanPayment, BankAccount, Category, Payee, Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { LoanList } from '@/components/loans/loan-list';
import { LoanForm } from '@/components/loans/loan-form';
import { LoanPaymentDialog } from '@/components/loans/loan-payment-dialog';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatCurrency } from '@/lib/utils';

const FAMILY_DATA_DOC = 'shared-data';

export default function LoansPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData, getFilteredData } = useDashboardData();


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);

  // We need to get all data, not just filtered data, for some operations.
  const { 
    loans, 
    loanPayments, 
    bankAccounts, 
    categories, 
    payees, 
    users,
    incomes,
    expenses
  } = allData;

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore) return;

    const {
        title,
        amount,
        installmentAmount,
        numberOfInstallments,
        startDate,
        paymentDay,
        payeeId,
        ownerId,
        depositOnCreate,
        depositToAccountId,
    } = values;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            
            // --- Step 1: READS ---
            let bankAccountDoc = null;
            let bankAccountData: BankAccount | null = null;
            if (depositOnCreate && depositToAccountId) {
                const bankAccountRef = doc(familyDataRef, 'bankAccounts', depositToAccountId);
                bankAccountDoc = await transaction.get(bankAccountRef);

                if (!bankAccountDoc.exists()) {
                    throw new Error('حساب بانکی انتخاب شده برای واریز یافت نشد.');
                }
                bankAccountData = bankAccountDoc.data() as BankAccount;
            }

            // --- Step 2: WRITES ---
            const loanData: Omit<Loan, 'id' | 'registeredByUserId' | 'paidInstallments' | 'remainingAmount' | 'payeeId' | 'depositToAccountId'> & { payeeId?: string, depositToAccountId?: string } = {
                title,
                amount,
                ownerId,
                installmentAmount: installmentAmount || 0,
                numberOfInstallments: numberOfInstallments || 0,
                startDate: startDate,
                paymentDay: paymentDay || 1,
            };

            if (payeeId) loanData.payeeId = payeeId;
            if (depositOnCreate && depositToAccountId) loanData.depositToAccountId = depositToAccountId;


            if (editingLoan) {
                // Editing logic is not part of this implementation.
            } else {
                // CREATE new loan
                const newLoanRef = doc(collection(familyDataRef, 'loans'));
                transaction.set(newLoanRef, {
                    ...loanData,
                    id: newLoanRef.id,
                    registeredByUserId: user.uid,
                    paidInstallments: 0,
                    remainingAmount: loanData.amount,
                });

                // Handle the optional deposit logic (writes only)
                if (depositOnCreate && depositToAccountId && bankAccountDoc && bankAccountData) {
                    const bankAccountRef = bankAccountDoc.ref;
                    
                    // 1. Update bank balance
                    const balanceAfter = bankAccountData.balance + loanData.amount;
                    transaction.update(bankAccountRef, { balance: balanceAfter });

                    // DO NOT create an income record. This is a liability, not income.
                }
                toast({ title: 'موفقیت', description: 'وام جدید با موفقیت ثبت شد.' });
            }
        });

        setIsFormOpen(false);
        setEditingLoan(null);

    } catch (error: any) {
        console.error("Error creating loan:", error);
        toast({
            variant: 'destructive',
            title: 'خطا در ثبت وام',
            description: error.message || 'مشکلی در ثبت اطلاعات پیش آمد.',
        });
    }
}, [user, firestore, editingLoan, toast, payees]);


  const handlePayInstallment = useCallback(async ({ loan, paymentBankAccountId, installmentAmount }: { loan: Loan, paymentBankAccountId: string, installmentAmount: number }) => {
    if (!user || !firestore || !bankAccounts || !categories) return;

    if (installmentAmount <= 0) {
        toast({ variant: "destructive", title: "خطا", description: "مبلغ قسط باید بیشتر از صفر باشد."});
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const loanRef = doc(familyDataRef, 'loans', loan.id);
            const accountToPayFromRef = doc(familyDataRef, 'bankAccounts', paymentBankAccountId);
            
            // --- Step 1: READS ---
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

            // --- Step 2: WRITES ---
            const balanceBefore = accountData.balance;
            const balanceAfter = balanceBefore - installmentAmount;
            const newPaidInstallments = currentLoanData.paidInstallments + 1;
            const newRemainingAmount = currentLoanData.remainingAmount - installmentAmount;

            // 1. Deduct from bank account
            transaction.update(accountToPayFromRef, { balance: balanceAfter });

            // 2. Update loan document
            transaction.update(loanRef, {
                paidInstallments: newPaidInstallments,
                remainingAmount: newRemainingAmount,
            });

            // 3. Create a loan payment record
            const paymentRef = doc(collection(familyDataRef, 'loanPayments'));
            transaction.set(paymentRef, {
                id: paymentRef.id,
                loanId: loan.id,
                bankAccountId: paymentBankAccountId,
                amount: installmentAmount,
                paymentDate: new Date().toISOString(),
                registeredByUserId: user.uid,
            });

            // 4. Create a corresponding expense
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
                loanPaymentId: paymentRef.id,
                createdAt: serverTimestamp(),
                balanceBefore: balanceBefore,
                balanceAfter: balanceAfter,
            });
        });
        toast({ title: "موفقیت", description: "قسط با موفقیت پرداخت و به عنوان هزینه ثبت شد." });
        setPayingLoan(null);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در پرداخت قسط",
            description: error.message,
        });
    }
  }, [user, firestore, bankAccounts, categories, toast]);

  const handleDelete = useCallback(async (loanId: string) => {
    if (!user || !firestore || !loans) return;

    const loanToDelete = loans.find(l => l.id === loanId);
    if (!loanToDelete) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const loanRef = doc(familyDataRef, 'loans', loanId);

            // Find and reverse associated payments
            const paymentsQuery = query(collection(familyDataRef, 'loanPayments'), where('loanId', '==', loanId));
            const paymentsSnapshot = await getDocs(paymentsQuery);

            for (const paymentDoc of paymentsSnapshot.docs) {
                const payment = paymentDoc.data() as LoanPayment;
                const accountRef = doc(familyDataRef, 'bankAccounts', payment.bankAccountId);
                const accountDoc = await transaction.get(accountRef);
                if (accountDoc.exists()) {
                    const accountData = accountDoc.data() as BankAccount;
                    transaction.update(accountRef, { balance: accountData.balance + payment.amount });
                }
                // Delete the payment record
                transaction.delete(paymentDoc.ref);
            }
            
            // Delete associated expenses
            const paymentIds = paymentsSnapshot.docs.map(d => d.id);
            if (paymentIds.length > 0) {
                 const expensesQuery = query(collection(familyDataRef, 'expenses'), where('loanPaymentId', 'in', paymentIds));
                 const expensesSnapshot = await getDocs(expensesQuery);
                 expensesSnapshot.forEach(doc => transaction.delete(doc.ref));
            }
            
             // Delete the main loan document
            transaction.delete(loanRef);
        });

        toast({ title: "موفقیت", description: "وام و تمام سوابق پرداخت آن با موفقیت حذف شدند." });

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در حذف وام",
            description: error.message || "مشکلی در حذف وام و سوابق آن پیش آمد.",
        });
    }
}, [user, firestore, loans, toast]);


  const handleAddNew = useCallback(() => {
    setEditingLoan(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((loan: Loan) => {
    setEditingLoan(loan);
    setIsFormOpen(true);
  }, []);
  
  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">مدیریت وام‌ها</h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          ثبت وام جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : isFormOpen ? (
        <LoanForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
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
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPay={setPayingLoan}
                bankAccounts={bankAccounts || []}
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
    </main>
  );
}
