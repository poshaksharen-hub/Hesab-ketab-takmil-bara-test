'use client';

import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Income, Expense, BankAccount } from '@/lib/types';
import React from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Fetch Incomes
  const incomesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'incomes') : null),
    [firestore, user]
  );
  const { data: incomes, isLoading: isLoadingIncomes } = useCollection<Income>(incomesQuery);

  // Fetch Expenses
  const expensesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'expenses') : null),
    [firestore, user]
  );
  const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);
  
  // Fetch Recent Transactions (combining latest 5 incomes and expenses)
    const recentIncomesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'incomes'), orderBy('date', 'desc'), limit(5)) : null),
    [firestore, user]
    );
    const { data: recentIncomes, isLoading: isLoadingRecentIncomes } = useCollection<Income>(recentIncomesQuery);

    const recentExpensesQuery = useMemoFirebase(
        () => (user ? query(collection(firestore, 'users', user.uid, 'expenses'), orderBy('date', 'desc'), limit(5)) : null),
        [firestore, user]
    );
    const { data: recentExpenses, isLoading: isLoadingRecentExpenses } = useCollection<Expense>(recentExpensesQuery);


  // Fetch Bank Accounts
  const bankAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'bankAccounts') : null),
    [firestore, user]
  );
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
  
  const allTransactions = React.useMemo(() => {
    const combined = [...(incomes || []), ...(expenses || [])];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomes, expenses]);

  const recentTransactions = React.useMemo(() => {
    const combined = [...(recentIncomes || []), ...(recentExpenses || [])];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
}, [recentIncomes, recentExpenses]);


  const monthlyMetrics = React.useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    const monthlyIncome = (incomes || [])
        .filter(inc => {
            const incDate = new Date(inc.date);
            return incDate >= start && incDate <= end;
        })
        .reduce((sum, inc) => sum + inc.amount, 0);
        
    const monthlyExpense = (expenses || [])
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= start && expDate <= end;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

    const totalBalance = (bankAccounts || []).reduce((sum, acc) => sum + acc.balance, 0);

    return { monthlyIncome, monthlyExpense, totalBalance };
  }, [incomes, expenses, bankAccounts]);


  const isLoading = isUserLoading || isLoadingIncomes || isLoadingExpenses || isLoadingBankAccounts || isLoadingRecentIncomes || isLoadingRecentExpenses;

  if (isLoading) {
    return (
      <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between space-y-2">
           <Skeleton className="h-8 w-48" />
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
      <div className="flex items-center justify-between space-y-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          داشبورد
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OverviewCards 
            totalIncome={monthlyMetrics.monthlyIncome}
            totalExpenses={monthlyMetrics.monthlyExpense}
            balance={monthlyMetrics.totalBalance}
            />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">هزینه بر اساس دسته‌بندی</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
              <SpendingChart transactions={allTransactions} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">تراکنش‌های اخیر</CardTitle>
          </CardHeader>
          <CardContent>
              <RecentTransactions transactions={recentTransactions} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
