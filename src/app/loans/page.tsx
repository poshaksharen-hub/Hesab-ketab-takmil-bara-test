
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, addDoc, serverTimestamp, query, where, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import type { Loan, LoanPayment, BankAccount, Category, Payee } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { LoanList } from '@/components/loans/loan-list';
import { LoanForm } from '@/components/loans/loan-form';
import { LoanPaymentDialog } from '@/components/loans/loan-payment-dialog';

export default function LoansPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);

  const loansQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'loans') : null),
    [firestore, user]
  );
  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);
  
  const loanPaymentsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'loanPayments') : null),
    [firestore, user]
  );
  const { data: loanPayments, isLoading: isLoadingLoanPayments } = useCollection<LoanPayment>(loanPaymentsQuery);


  const bankAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'bankAccounts') : null),
    [firestore, user]
  );
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
  
  const categoriesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'categories') : null),
    [firestore, user]
  );
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

  const payeesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'payees') : null),
    [firestore, user]
  );
  const { data: payees, isLoading: isLoadingPayees } = useCollection<Payee>(payeesQuery);

  const handleFormSubmit = async (values: any) => {
    if (!user || !firestore) return;
    const { depositOnCreate, depositToAccountId, ...loanData } = values;

    try {
        await runTransaction(firestore, async (transaction) => {
            if (editingLoan) {
                // Edit loan
                const loanRef = doc(firestore, 'users', user.uid, 'loans', editingLoan.id);
                // Note: Logic for changing loan amount after creation can be complex.
                // For simplicity, we are just updating the description/title here.
                transaction.update(loanRef, loanData);
                toast({ title: "موفقیت", description: "وام با موفقیت ویرایش شد." });
            } else {
                // Create loan
                const newLoanRef = doc(collection(firestore, 'users', user.uid, 'loans'));
                transaction.set(newLoanRef, {
                    ...loanData,
                    id: newLoanRef.id,
                    userId: user.uid,
                    paidInstallments: 0,
                    remainingAmount: loanData.amount,
                });
                
                // Optional: Deposit loan amount as an income
                if (depositOnCreate && depositToAccountId) {
                    const bankAccountRef = doc(firestore, 'users', user.uid, 'bankAccounts', depositToAccountId);
                    const incomeRef = doc(collection(firestore, 'users', user.uid, 'incomes'));
                    
                    const bankAccountDoc = await transaction.get(bankAccountRef);
                    if (!bankAccountDoc.exists()) throw new Error("حساب بانکی برای واریز مبلغ وام یافت نشد.");
                    
                    transaction.update(bankAccountRef, { balance: bankAccountDoc.data().balance + loanData.amount });
                    transaction.set(incomeRef, {
                        id: incomeRef.id,
                        userId: user.uid,
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
  };

  const handlePayInstallment = async ({ loan, paymentBankAccountId, installmentAmount }: { loan: Loan, paymentBankAccountId: string, installmentAmount: number }) => {
    if (!user || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const loanRef = doc(firestore, 'users', user.uid, 'loans', loan.id);
            const bankAccountRef = doc(firestore, 'users', user.uid, 'bankAccounts', paymentBankAccountId);
            
            const bankAccountDoc = await transaction.get(bankAccountRef);
            if (!bankAccountDoc.exists() || bankAccountDoc.data().balance < installmentAmount) {
                throw new Error("موجودی حساب برای پرداخت قسط کافی نیست.");
            }

            // 1. Deduct from bank account
            transaction.update(bankAccountRef, { balance: bankAccountDoc.data().balance - installmentAmount });

            // 2. Update loan document
            const newPaidInstallments = (loan.paidInstallments || 0) + 1;
            const newRemainingAmount = loan.remainingAmount - installmentAmount;
            transaction.update(loanRef, {
                paidInstallments: newPaidInstallments,
                remainingAmount: newRemainingAmount,
            });

            // 3. Create a loan payment record
            const paymentRef = doc(collection(firestore, 'users', user.uid, 'loanPayments'));
            transaction.set(paymentRef, {
                id: paymentRef.id,
                loanId: loan.id,
                bankAccountId: paymentBankAccountId,
                amount: installmentAmount,
                paymentDate: new Date().toISOString(),
                userId: user.uid,
            });

            // 4. Create a corresponding expense
            const expenseRef = doc(collection(firestore, 'users', user.uid, 'expenses'));
            const expenseCategory = categories?.find(c => c.name === 'پرداخت اقساط') || categories?.[0];
            transaction.set(expenseRef, {
                id: expenseRef.id,
                userId: user.uid,
                amount: installmentAmount,
                bankAccountId: paymentBankAccountId,
                categoryId: expenseCategory?.id || 'uncategorized',
                date: new Date().toISOString(),
                description: `پرداخت قسط وام: ${loan.title}`,
                type: 'expense',
                loanPaymentId: paymentRef.id,
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
  };

  const handleDelete = async (loanId: string) => {
    if (!user || !firestore) return;
    
    try {
        const batch = writeBatch(firestore);
        
        // Find and delete all payments for this loan
        const paymentsQuery = query(collection(firestore, 'users', user.uid, 'loanPayments'), where('loanId', '==', loanId));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentIds = paymentsSnapshot.docs.map(d => d.id);
        paymentsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Find and delete all expenses associated with those payments
        if (paymentIds.length > 0) {
            const expensesQuery = query(collection(firestore, 'users', user.uid, 'expenses'), where('loanPaymentId', 'in', paymentIds));
            const expensesSnapshot = await getDocs(expensesQuery);
            expensesSnapshot.forEach(doc => batch.delete(doc.ref));
        }

        // Delete the main loan document
        const loanRef = doc(firestore, 'users', user.uid, 'loans', loanId);
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
  };


  const handleAddNew = () => {
    setEditingLoan(null);
    setIsFormOpen(true);
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setIsFormOpen(true);
  };
  
  const isLoading = isUserLoading || isLoadingLoans || isLoadingBankAccounts || isLoadingCategories || isLoadingLoanPayments || isLoadingPayees;

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
