
'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { LoanForm } from '@/components/loans/loan-form';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import type { Loan } from '@/lib/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const FAMILY_DATA_DOC = 'shared-data';

export default function EditLoanPage() {
  const router = useRouter();
  const params = useParams();
  const loanId = params.loanId as string;

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const { 
    loans,
    bankAccounts,
    payees
  } = allData;

  const initialData = useMemo(() => loans?.find(l => l.id === loanId) || null, [loans, loanId]);

  const handleCancel = () => {
    router.back();
  };

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore || !loanId) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const loanRef = doc(familyDataRef, 'loans', loanId);

            const loanDoc = await transaction.get(loanRef);
            if (!loanDoc.exists()) {
                throw new Error('این وام برای ویرایش یافت نشد.');
            }

            const submissionData = {
                ...values,
                startDate: values.startDate.toISOString(),
                firstInstallmentDate: values.firstInstallmentDate.toISOString(),
            };
            
            // Since this is an edit, we don't handle the deposit logic here
            // We only update the core loan data.
            const { title, amount, installmentAmount, numberOfInstallments, startDate, firstInstallmentDate, payeeId, ownerId } = submissionData;

            const oldLoanData = loanDoc.data() as Loan;
            const amountDifference = amount - oldLoanData.amount;
            const newRemainingAmount = oldLoanData.remainingAmount + amountDifference;

            if (newRemainingAmount < 0) {
                 throw new Error('مبلغ جدید وام نمی‌تواند کمتر از مبلغ پرداخت شده باشد.');
            }

            transaction.update(loanRef, { 
                title,
                amount,
                installmentAmount,
                numberOfInstallments,
                startDate,
                firstInstallmentDate,
                payeeId,
                ownerId,
                remainingAmount: newRemainingAmount
             });
        });

        toast({ title: 'موفقیت', description: 'وام با موفقیت ویرایش شد.' });
        router.push('/loans'); // Redirect to the loans list

    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             throw new FirestorePermissionError({
                path: `family-data/shared-data/loans/${loanId}`,
                operation: 'update',
                requestResourceData: values,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'خطا در ویرایش وام',
                description: error.message || 'مشکلی در ویرایش اطلاعات پیش آمد.',
            });
        }
    }
  }, [user, firestore, toast, loanId, router]);

  if (isDashboardLoading) {
      return (
          <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-96 w-full" />
          </div>
      )
  }

  if (!initialData) {
      return (
          <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
              <h1 className="text-2xl font-bold">وام یافت نشد</h1>
              <p>وامی با این شناسه وجود ندارد یا شما دسترسی لازم برای مشاهده آن را ندارید.</p>
              <Link href="/loans">
                  <Button>بازگشت به لیست وام‌ها</Button>
              </Link>
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
            <h1 className="font-headline text-3xl font-bold tracking-tight">ویرایش وام</h1>
        </div>
      <LoanForm
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          initialData={initialData}
          bankAccounts={bankAccounts || []}
          payees={payees || []}
      />
    </div>
  );
}
