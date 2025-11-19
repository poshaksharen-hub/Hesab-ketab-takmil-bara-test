
'use client';
import React from 'react';
import { InsightsGenerator } from '@/components/insights/insights-generator';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function InsightsPage() {
  const { isLoading, allData } = useDashboardData();

  const transactionHistory = React.useMemo(() => {
    if (isLoading || !allData) return "[]";
    const allTransactions = [...allData.incomes, ...allData.expenses];
    // Sort by date to have a chronological history
    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return JSON.stringify(allTransactions, null, 2);
  }, [isLoading, allData]);


  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          تحلیل هوشمند مالی
        </h1>
      </div>
      <p className="text-muted-foreground">
        از قدرت هوش مصنوعی برای تحلیل عادت‌های مالی و دریافت پیشنهادهای شخصی‌سازی شده استفاده کنید.
      </p>
      
      {isLoading ? (
        <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
      ) : (
        <InsightsGenerator transactionHistory={transactionHistory} />
      )}
    </main>
  );
}
