
'use client';
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  serverTimestamp,
  addDoc,
  updateDoc,
  runTransaction,
  deleteDoc,
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
import Link from 'next/link';

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

    // Separate dueDate from the rest of the values
    const { dueDate, ...restOfValues } = values;

    const debtData: Partial<PreviousDebt> = {
        ...restOfValues,
        registeredByUserId: user.uid,
        remainingAmount: values.amount,
        paidInstallments: 0, // Always initialize with 0
    };

    // Only add dueDate back if it's not an installment plan
    if (!values.isInstallment && dueDate) {
        debtData.dueDate = dueDate;
    }

    const newDebtRef = collection(doc(firestore, 'family-data', FAMILY_DATA_DOC), 'previousDebts');
    
    addDoc(newDebtRef, debtData)
        .then(docRef => {
            updateDoc(docRef, { id: docRef.id });
            toast({ title: 'موفقیت', description: 'بدهی جدید با موفقیت ثبت شد.' });
            setIsFormOpen(false);
        })
        .catch(error => {
            throw new FirestorePermissionError({
                path: newDebtRef.path,
                operation: 'create',
                requestResourceData: debtData,
            });
        });

  }, [user, firestore, toast]);


  const handlePayDebt = useCallback(async ({ debt, paymentBankAccountId, amount }: { debt: PreviousDebt, paymentBankAccountId: string, amount: number }) => {
    if (!user || !firestore || !categories || !bankAccounts) return;

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
        const newPaidInstallments = (currentDebtData.paidInstallments || 0) + 1; // Increment paid installments
        const balanceBefore = accountData.balance;
        const balanceAfter = balanceBefore - amount;
        
        const expenseCategory = categories.find(c => c.name.includes('بدهی')) || categories[0];
        
        // Update debt
        transaction.update(debtRef, { 
            remainingAmount: newRemainingAmount,
            paidInstallments: newPaidInstallments // Save new count
        });
        
        // Update account balance
        transaction.update(accountToPayFromRef, { balance: balanceAfter });

        // Create payment record
        const newPaymentRef = doc(collection(familyDataRef, 'debtPayments'));
        transaction.set(newPaymentRef, {
            id: newPaymentRef.id,
            debtId: debt.id,
            bankAccountId: paymentBankAccountId,
            amount: amount,
            paymentDate: new Date().toISOString(),
            registeredByUserId: user.uid,
        });
        
        // Create expense record
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
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             throw new FirestorePermissionError({
                path: `family-data/shared-data/previousDebts/${debt.id}`,
                operation: 'write'
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'خطا در پرداخت بدهی',
                description: error.message,
            });
        }
    }
  }, [user, firestore, categories, bankAccounts, toast]);

  const handleDeleteDebt = useCallback(async (debtId: string) => {
    if (!user || !firestore || !previousDebts) return;

    const debtToDelete = previousDebts.find(d => d.id === debtId);
    if (!debtToDelete) {
        toast({ variant: 'destructive', title: 'خطا', description: 'بدهی مورد نظر یافت نشد.'});
        return;
    }
    
    // Use paidInstallments to check for history
    if (debtToDelete.paidInstallments > 0) {
        toast({ variant: 'destructive', title: 'امکان حذف وجود ندارد', description: 'این بدهی دارای سابقه پرداخت است. برای حذف، ابتدا باید تمام پرداخت‌های مرتبط را به صورت دستی برگردانید.'});
        return;
    }

    const debtRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'previousDebts', debtId);
    
    deleteDoc(debtRef).then(() => {
        toast({ title: "موفقیت", description: "بدهی با موفقیت حذف شد." });
    }).catch(error => {
        throw new FirestorePermissionError({ path: debtRef.path, operation: 'delete'});
    });

  }, [user, firestore, previousDebts, toast]);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/">
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="font-headline text-3xl font-bold tracking-tight">مدیریت بدهی‌ها</h1>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="ml-2 h-4 w-4" />
          ثبت بدهی جدید
        </Button>
      </div>

      <DebtForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          payees={payees || []}
        />
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
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
