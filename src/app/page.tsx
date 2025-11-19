'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { DateRangeFilter, type DateRange } from '@/components/dashboard/date-range-filter';
import { useFinancialSummary } from '@/hooks/use-financial-summary';
import { OverallSummary } from '@/components/dashboard/overall-summary';
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart';
import { AccountBalanceCards } from '@/components/dashboard/account-balance-cards';
import { CategorySpending } from '@/components/dashboard/category-spending';
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines';

export default function DashboardPage() {
  const { isUserLoading } = useUser();
  const [dateRange, setDateRange] = useState<DateRange>('thisMonth');

  const {
    summary,
    isLoading: isLoadingData,
  } = useFinancialSummary({ dateRange });

  const isLoading = isUserLoading || isLoadingData;
  
  if (isLoading) {
    return (
      <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between space-y-2">
           <Skeleton className="h-8 w-48" />
           <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-7">
            <Card className="xl:col-span-4">
                 <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                 </CardHeader>
                 <CardContent>
                    <Skeleton className="h-[350px]" />
                 </CardContent>
            </Card>
            <Card className="xl:col-span-3">
                <CardHeader>
                     <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
      </main>
    )
  }
  
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          داشبورد جامع مالی
        </h1>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Overall Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <OverallSummary summary={summary} />
      </div>

       {/* Account Balance Cards */}
       <div className="grid gap-4 md:grid-cols-3">
        <AccountBalanceCards 
            aliBalance={summary.aliTotalBalance}
            fatemehBalance={summary.fatemehTotalBalance}
            sharedBalance={summary.sharedTotalBalance}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">روند درآمد و هزینه</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <IncomeExpenseChart 
                income={summary.totalIncome}
                expense={summary.totalExpense}
            />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">هزینه‌ها بر اساس دسته‌بندی</CardTitle>
          </CardHeader>
          <CardContent>
             <CategorySpending expenses={summary.expenses} categories={summary.categories}/>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">موعدهای پیش رو</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <UpcomingDeadlines 
                checks={summary.checks} 
                loans={summary.loans}
                payees={summary.payees}
            />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">تراکنش‌های اخیر</CardTitle>
          </CardHeader>
          <CardContent>
              <RecentTransactions 
                transactions={summary.recentTransactions} 
                categories={summary.categories} 
                users={summary.users}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
