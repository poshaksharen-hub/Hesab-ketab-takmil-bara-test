
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, addDoc, serverTimestamp, query, where, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import type { Loan, LoanPayment, BankAccount, Category, Payee } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { LoanList } from '@/components/loans/loan-list';
import { LoanForm } from '@/components/loans/loan-form';
import { LoanPaymentDialog } from '@/components/loans/loan-payment-dialog';
import { useDashboardData } from '@/hooks/use-dashboard-data';

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

  const handleFormSubmit = React.useCallback(async (values: any) => {
    if (!user || !firestore || !bankAccounts) return;
    const { depositOnCreate, depositToAccountId, ...loanData } = values;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);

            if (editingLoan) {
                // Edit loan
                const loanRef = doc(familyDataRef, 'loans', editingLoan.id);
                transaction.update(loanRef, loanData);
                toast({ title: "موفقیت", description: "وام با موفقیت ویرایش شد." });
            } else {
                // Create loan
                const newLoanRef = doc(collection(familyDataRef, 'loans'));
                transaction.set(newLoanRef, {
                    ...loanData,
                    id: newLoanRef.id,
                    registeredByUserId: user.uid,
                    paidInstallments: 0,
                    remainingAmount: loanData.amount,
                });
                
                // Optional: Deposit loan amount as an income
                if (depositOnCreate && depositToAccountId) {
                    const accountToDeposit = bankAccounts.find(acc => acc.id === depositToAccountId);
                    if (!accountToDeposit) throw new Error("حساب بانکی برای واریز مبلغ وام یافت نشد.");
                    
                    const bankAccountRef = doc(familyDataRef, 'bankAccounts', depositToAccountId);
                    const incomeRef = doc(collection(familyDataRef, 'incomes'));
                    
                    const bankAccountDoc = await transaction.get(bankAccountRef);
                    if (!bankAccountDoc.exists()) throw new Error("حساب بانکی برای واریز یافت نشد.");
                    
                    transaction.update(bankAccountRef, { balance: bankAccountDoc.data().balance + loanData.amount });
                    transaction.set(incomeRef, {
                        id: incomeRef.id,
                        ownerId: accountToDeposit.ownerId,
                        registeredByUserId: user.uid,
                        amount: loanData.amount,
                        bankAccountId: depositToAccountId,
                        date: loanData.startDate,
                        description: `دریافت وام: ${loanData.title}`,
                        type: 'income',
                        category: 'درآمد',
                        source: 'وام',
                        createdAt: serverTimestamp(),
                    });
                }
                toast({ title: "موفقیت", description: "وام جدید با موفقیت ثبت شد." });
            }
        });
        setIsFormOpen(false);
        setEditingLoan(null);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در ثبت وام",
            description: error.message || "مشکلی در ثبت اطلاعات پیش آمد.",
        });
    }
  }, [user, firestore, bankAccounts, editingLoan, toast]);

  const handlePayInstallment = React.useCallback(async ({ loan, paymentBankAccountId, installmentAmount }: { loan: Loan, paymentBankAccountId: string, installmentAmount: number }) => {
    if (!user || !firestore || !bankAccounts || !categories) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const loanRef = doc(familyDataRef, 'loans', loan.id);
            
            const accountToPayFrom = bankAccounts.find(acc => acc.id === paymentBankAccountId);
            if (!accountToPayFrom) throw new Error("کارت بانکی برای پرداخت یافت نشد.");
            
            const bankAccountRef = doc(familyDataRef, 'bankAccounts', paymentBankAccountId);
            
            const bankAccountDoc = await transaction.get(bankAccountRef);
            const availableBalance = bankAccountDoc.data()!.balance - (bankAccountDoc.data()!.blockedBalance || 0);

            if (!bankAccountDoc.exists() || availableBalance < installmentAmount) {
                throw new Error("موجودی حساب برای پرداخت قسط کافی نیست.");
            }

            // 1. Deduct from bank account
            const balanceBefore = bankAccountDoc.data()!.balance;
            const balanceAfter = balanceBefore - installmentAmount;
            transaction.update(bankAccountRef, { balance: balanceAfter });

            // 2. Update loan document
            const newPaidInstallments = (loan.paidInstallments || 0) + 1;
            const newRemainingAmount = loan.remainingAmount - installmentAmount;
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
                ownerId: accountToPayFrom.ownerId,
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

  const handleDelete = React.useCallback(async (loanId: string) => {
    if (!user || !firestore || !loans || !users) return;

    const loanToDelete = loans.find(l => l.id === loanId);
    if (!loanToDelete) return;

    try {
        const batch = writeBatch(firestore);
        const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
        
        // Find and delete all payments for this loan
        const paymentsQuery = query(collection(familyDataRef, 'loanPayments'), where('loanId', '==', loanId));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentIds = paymentsSnapshot.docs.map(d => d.id);
        paymentsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Find and delete all expenses associated with those payments
        if (paymentIds.length > 0) {
            const expensesQuery = query(collection(familyDataRef, 'expenses'), where('loanPaymentId', 'in', paymentIds));
            const expensesSnapshot = await getDocs(expensesQuery);
            expensesSnapshot.forEach(doc => batch.delete(doc.ref));
        }
       
        // Delete the main loan document
        const loanRef = doc(familyDataRef, 'loans', loanId);
        batch.delete(loanRef);

        await batch.commit();

        toast({ title: "موفقیت", description: "وام و تمام سوابق پرداخت آن با موفقیت حذف شدند." });

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در حذف وام",
            description: error.message || "مشکلی در حذف وام و سوابق آن پیش آمد.",
        });
    }
  }, [user, firestore, loans, users, toast]);


  const handleAddNew = React.useCallback(() => {
    setEditingLoan(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = React.useCallback((loan: Loan) => {
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
                loanPayments={loanPayments || []}
                payees={payees || []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPay={setPayingLoan}
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
