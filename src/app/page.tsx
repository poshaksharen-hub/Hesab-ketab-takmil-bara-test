import { OverviewCards } from '@/components/dashboard/overview-cards';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { mockTransactions } from '@/lib/data';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const transactions = mockTransactions;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          داشبورد
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<Skeleton className="h-32" />}>
          <OverviewCards transactions={transactions} />
        </Suspense>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">هزینه بر اساس دسته‌بندی</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Suspense fallback={<Skeleton className="h-[350px]" />}>
              <SpendingChart transactions={transactions} />
            </Suspense>
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">تراکنش‌های اخیر</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[350px]" />}>
              <RecentTransactions transactions={transactions.slice(0, 5)} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
