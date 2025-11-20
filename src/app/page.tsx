
'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useAuth } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { CustomDateRangePicker } from '@/components/dashboard/date-range-filter';
import { OverallSummary } from '@/components/dashboard/overall-summary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { CategorySpending } from '@/components/dashboard/category-spending';
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines';
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart';
import { AccountBalanceCards } from '@/components/dashboard/account-balance-cards';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { USER_DETAILS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { OwnerId } from '@/lib/types';

function DashboardSkeleton() {
  const auth = useAuth();
  const router = useRouter();
  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push('/login');
  };

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={handleSignOut}>
                <LogOut className="ml-2 h-4 w-4" />
                خروج اضطراری
            </Button>
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-72" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-10 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    </main>
  );
}

export default function DashboardPage() {
  const { isUserLoading } = useUser();
  const [ownerFilter, setOwnerFilter] = useState<OwnerId | 'all'>('all');
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  
  const { isLoading, getFilteredData, allData } = useDashboardData();

  const { summary, details } = getFilteredData(ownerFilter, date);
  
  const { 
      totalAssets, 
      totalLiabilities,
      netWorth,
      aliBalance,
      fatemehBalance,
      sharedBalance
   } = getFilteredData('all', undefined).summary; // Global summaries are always 'all'


  const effectiveLoading = isUserLoading || isLoading;

  if (effectiveLoading) {
    return <DashboardSkeleton />;
  }
  
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مرکز تحلیل مالی
        </h1>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row">
           <Select onValueChange={(value) => setOwnerFilter(value as OwnerId | 'all')} defaultValue="all">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="نمایش داده‌های..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value='ali'>{USER_DETAILS.ali.firstName}</SelectItem>
                <SelectItem value='fatemeh'>{USER_DETAILS.fatemeh.firstName}</SelectItem>
                <SelectItem value="shared">مشترک</SelectItem>
              </SelectContent>
            </Select>
            <CustomDateRangePicker date={date} setDate={setDate} />
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <OverallSummary summary={{ netWorth, totalAssets, totalLiabilities, totalIncome: summary.totalIncome, totalExpense: summary.totalExpense }} />
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AccountBalanceCards 
            aliBalance={aliBalance}
            fatemehBalance={fatemehBalance}
            sharedBalance={sharedBalance}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="transactions">تراکنش‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
                <Card className="xl:col-span-3">
                    <CardHeader>
                        <CardTitle className="font-headline">درآمد در مقابل هزینه</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <IncomeExpenseChart income={summary.totalIncome} expense={summary.totalExpense} />
                    </CardContent>
                </Card>
                <Card className="xl:col-span-4">
                    <CardHeader>
                    <CardTitle className="font-headline">هزینه‌ها بر اساس دسته‌بندی</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <CategorySpending expenses={details.expenses} categories={allData.categories}/>
                    </CardContent>
                </Card>
            </div>
             <div className="grid grid-cols-1 gap-4">
                 <Card className="xl:col-span-3">
                    <CardHeader>
                    <CardTitle className="font-headline">موعدهای پیش رو</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                    <UpcomingDeadlines 
                        checks={allData.checks} 
                        loans={allData.loans}
                        payees={allData.payees}
                    />
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">تراکنش‌های اخیر</CardTitle>
                </CardHeader>
                <CardContent>
                    <RecentTransactions 
                        transactions={details.transactions} 
                        categories={allData.categories} 
                        users={allData.users}
                        bankAccounts={allData.bankAccounts}
                    />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
