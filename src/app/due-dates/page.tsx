
'use client';
import React, { useMemo } from 'react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { DueDatesList, type Deadline } from '@/components/due-dates/due-dates-list';
import { getNextDueDate } from '@/lib/date-utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


export default function DueDatesPage() {
  const { isLoading, allData } = useDashboardData();
  const router = useRouter();
  const { toast } = useToast();

  const deadlines = useMemo(() => {
    if (isLoading) return [];
    
    const { checks, loans, payees } = allData;

    const upcomingChecks = (checks || [])
      .filter(c => c.status === 'pending')
      .map(c => ({
        id: c.id,
        type: 'check' as const,
        date: new Date(c.dueDate),
        title: `چک برای ${payees.find(p => p.id === c.payeeId)?.name || 'ناشناс'}`,
        amount: c.amount,
        originalItem: c,
      }));

    const upcomingLoanPayments = (loans || [])
      .filter(l => l.paidInstallments < l.numberOfInstallments)
      .map(l => ({
        id: l.id,
        type: 'loan' as const,
        date: getNextDueDate(l.startDate, l.paymentDay),
        title: `قسط وام: ${l.title}`,
        amount: l.installmentAmount,
        originalItem: l,
      }));

    return [...upcomingChecks, ...upcomingLoanPayments]
      .sort((a, b) => a.date.getTime() - b.date.getTime());
      
  }, [isLoading, allData]);
  
  const handleAction = (item: Deadline) => {
    if (item.type === 'check') {
        router.push('/checks');
        toast({
            title: "انتقال به صفحه چک‌ها",
            description: `چک برای ${allData.payees.find(p => p.id === (item.originalItem as any).payeeId)?.name || 'ناشناс'} انتخاب شد.`,
        });
    } else {
        router.push('/loans');
        toast({
            title: "انتقال به صفحه وام‌ها",
            description: `وام "${item.title}" برای پرداخت قسط انتخاب شد.`,
        });
    }
  };


  if (isLoading) {
    return (
        <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight">سررسیدهای نزدیک</h1>
            <p className="text-muted-foreground">تعهدات مالی پیش روی شما در اینجا نمایش داده می‌شود.</p>
            <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        </main>
    )
  }


  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
       <div className="flex items-center justify-between">
            <div className='space-y-2'>
                <h1 className="font-headline text-3xl font-bold tracking-tight">سررسیدهای نزدیک</h1>
                <p className="text-muted-foreground">تعهدات مالی پیش روی شما (چک‌ها و اقساط وام) در اینجا نمایش داده می‌شود.</p>
            </div>
        </div>
        <DueDatesList deadlines={deadlines} onAction={handleAction} />
    </main>
  );
}
