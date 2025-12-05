
'use client';
import React, { useMemo } from 'react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { DueDatesList, type Deadline } from '@/components/due-dates/due-dates-list';
import { getNextDueDate } from '@/lib/date-utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Check, Loan, PreviousDebt } from '@/lib/types';


export default function DueDatesPage() {
  const { isLoading, allData } = useDashboardData();
  const router = useRouter();
  const { toast } = useToast();

  const deadlines = useMemo(() => {
    if (isLoading) return [];
    
    const { checks, loans, payees, previousDebts, users, categories, bankAccounts } = allData;

    const upcomingChecks: Deadline[] = (checks || [])
      .filter(c => c.status === 'pending')
      .map(c => ({
        id: c.id,
        type: 'check',
        date: new Date(c.dueDate),
        title: `چک به ${payees.find(p => p.id === c.payeeId)?.name || 'ناشناس'}`,
        amount: c.amount,
        details: {
          expenseFor: c.expenseFor,
          bankAccountName: bankAccounts.find(b => b.id === c.bankAccountId)?.bankName || 'نامشخص',
          registeredBy: users.find(u => u.id === c.registeredByUserId)?.firstName || 'نامشخص'
        },
        originalItem: c,
      }));

    const upcomingLoanPayments: Deadline[] = (loans || [])
      .filter(l => l.remainingAmount > 0)
      .map(l => ({
        id: l.id,
        type: 'loan',
        date: getNextDueDate(l.startDate, l.paymentDay),
        title: `قسط وام: ${l.title}`,
        amount: l.installmentAmount,
         details: {
          expenseFor: l.expenseFor,
          bankAccountName: '---', // Not applicable for loan itself
          registeredBy: users.find(u => u.id === l.registeredByUserId)?.firstName || 'نامشخص'
        },
        originalItem: l,
      }));

     const upcomingDebts: Deadline[] = (previousDebts || [])
      .filter(d => d.remainingAmount > 0)
      .map(d => {
        let dueDate: Date | null = null;
        let amount = d.installmentAmount || d.remainingAmount;

        if (d.isInstallment && d.paymentDay) {
          dueDate = getNextDueDate(d.startDate, d.paymentDay);
        } else if (!d.isInstallment && d.dueDate) {
          dueDate = new Date(d.dueDate);
        }

        if (!dueDate) return null;

        return {
          id: d.id,
          type: 'debt' as const,
          date: dueDate,
          title: `پرداخت بدهی: ${d.description}`,
          amount: amount,
          details: {
            expenseFor: d.expenseFor,
            bankAccountName: '---',
            registeredBy: users.find(u => u.id === d.registeredByUserId)?.firstName || 'نامشخص'
          },
          originalItem: d,
        };
      }).filter((d): d is Deadline => d !== null);


    return [...upcomingChecks, ...upcomingLoanPayments, ...upcomingDebts]
      .sort((a, b) => a.date.getTime() - b.date.getTime());
      
  }, [isLoading, allData]);
  
  const handleAction = (item: Deadline) => {
    switch (item.type) {
        case 'check':
            router.push('/checks');
            toast({
                title: "انتقال به صفحه چک‌ها",
                description: `چک برای ${allData.payees.find(p => p.id === (item.originalItem as Check).payeeId)?.name || 'ناشناس'} انتخاب شد.`,
            });
            break;
        case 'loan':
            router.push('/loans');
            toast({
                title: "انتقال به صفحه وام‌ها",
                description: `وام "${item.title}" برای پرداخت قسط انتخاب شد.`,
            });
            break;
        case 'debt':
             router.push('/debts');
            toast({
                title: "انتقال به صفحه بدهی‌ها",
                description: `بدهی "${item.title}" برای پرداخت انتخاب شد.`,
            });
            break;
    }
  };


  if (isLoading) {
    return (
        <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight">سررسیدهای نزدیک</h1>
            <p className="text-muted-foreground">تعهدات مالی پیش روی شما در اینجا نمایش داده می‌شود.</p>
            <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
            </div>
        </main>
    )
  }


  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
       <div className="flex items-center justify-between">
            <div className='space-y-2'>
                <h1 className="font-headline text-3xl font-bold tracking-tight">سررسیدهای نزدیک</h1>
                <p className="text-muted-foreground">چک‌ها، اقساط وام و بدهی‌های پیش روی شما در اینجا نمایش داده می‌شود.</p>
            </div>
        </div>
        <DueDatesList deadlines={deadlines} onAction={handleAction} />
    </main>
  );
}
