
'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { LoanForm } from '@/components/loans/loan-form';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import type { Loan, BankAccount, Payee, TransactionDetails } from '@/lib/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { sendSystemNotification } from '@/lib/notifications';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const FAMILY_DATA_DOC = 'shared-data';

export default function NewLoanPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const { 
    bankAccounts,
    payees,
    users
  } = allData;

  const handleCancel = () => {
    router.back();
  };

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore || !users || !payees || !bankAccounts) return;

    const {
        title,
        amount,
        installmentAmount,
        numberOfInstallments,
        startDate,
        firstInstallmentDate,
        payeeId,
        ownerId,
        depositOnCreate,
        depositToAccountId,
    } = values;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            
            const loanData: Omit<Loan, 'id' | 'registeredByUserId' | 'paidInstallments' | 'remainingAmount' > = {
                title,
                amount,
                ownerId,
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
        router.push('/loans'); // Redirect to the loans list

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
  }, [user, firestore, toast, payees, bankAccounts, users, router]);


  if (isDashboardLoading) {
      return (
          <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-96 w-full" />
          </div>
      )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center gap-2">
            <Link href="/loans" passHref>
                <Button variant="ghost" size="icon">
                    <ArrowRight className="h-5 w-5" />
                </Button>
            </Link>
            <h1 className="font-headline text-3xl font-bold tracking-tight">ثبت وام جدید</h1>
        </div>
      <LoanForm
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          initialData={null} // This is for new loans only
          bankAccounts={bankAccounts || []}
          payees={payees || []}
      />
    </div>
  );
}

    