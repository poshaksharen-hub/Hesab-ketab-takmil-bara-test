
'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, User, Users, FolderKanban, TrendingDown, Wallet } from 'lucide-react';
import type { Expense, ExpenseFor, UserProfile, Category, BankAccount, Payee } from '@/lib/types';
import { formatCurrency, formatJalaliDate, cn } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpenseList } from '@/components/transactions/expense-list';
import Link from 'next/link';
import { useDashboardData } from '@/hooks/use-dashboard-data';

type FilterType = 'all' | ExpenseFor;

function CategoryDetailSkeleton() {
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent>
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function CategoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.categoryId as string;
  const [filter, setFilter] = useState<FilterType>('all');
  const { isLoading, allData } = useDashboardData();
  const { expenses, categories, bankAccounts, payees, users } = allData;

  const { category, filteredExpenses, totalAmount } = useMemo(() => {
    if (isLoading || !categoryId || !categories || !expenses) {
      return { category: null, filteredExpenses: [], totalAmount: 0 };
    }
    const currentCategory = categories.find((c) => c.id === categoryId);
    if (!currentCategory) {
      return { category: null, filteredExpenses: [], totalAmount: 0 };
    }

    const categoryExpenses = expenses.filter(e => e.categoryId === categoryId);
    
    const expensesToDisplay = filter === 'all' 
        ? categoryExpenses 
        : categoryExpenses.filter(e => e.expenseFor === filter);

    const amount = expensesToDisplay.reduce((sum, e) => sum + e.amount, 0);

    return { category: currentCategory, filteredExpenses: expensesToDisplay, totalAmount: amount };

  }, [isLoading, categoryId, categories, expenses, filter]);

  if (isLoading) {
    return <CategoryDetailSkeleton />;
  }

  if (!category) {
    return (
      <main className="flex-1 p-4 pt-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>دسته‌بندی یافت نشد</CardTitle>
          </CardHeader>
          <CardContent>
            <p>متاسفانه دسته‌بندی با این مشخصات در سیستم وجود ندارد.</p>
            <Button onClick={() => router.push('/categories')} className="mt-4">
              بازگشت به لیست
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const handleDelete = (expenseId: string) => {
      // In a real app, you'd call the delete logic from useDashboardData or a similar hook.
      // For this prototype, we'll just show a toast.
      console.log(`Deletion requested for expense ${expenseId}, but not implemented in detail view.`);
  }

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="space-y-1">
              <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
                <FolderKanban className="w-8 h-8 text-primary" />
                {category.name}
              </h1>
              <p className="text-muted-foreground">{category.description || 'جزئیات هزینه‌های این دسته‌بندی'}</p>
            </div>
        </div>
      </div>

       <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مجموع هزینه در این دسته‌بندی</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalAmount, 'IRT')}</div>
                <p className="text-xs text-muted-foreground">بر اساس فیلتر انتخاب شده</p>
            </CardContent>
        </Card>
      
      <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
                <Wallet className="ml-2 h-4 w-4" />
                همه
            </TabsTrigger>
            <TabsTrigger value="ali">
                <User className="ml-2 h-4 w-4" />
                {USER_DETAILS.ali.firstName}
            </TabsTrigger>
            <TabsTrigger value="fatemeh">
                 <User className="ml-2 h-4 w-4" />
                {USER_DETAILS.fatemeh.firstName}
            </TabsTrigger>
            <TabsTrigger value="shared">
                 <Users className="ml-2 h-4 w-4" />
                مشترک
            </TabsTrigger>
        </TabsList>
         <TabsContent value={filter}>
            <ExpenseList
                expenses={filteredExpenses}
                bankAccounts={bankAccounts || []}
                categories={categories || []}
                users={users || []}
                payees={payees || []}
                onDelete={handleDelete}
            />
         </TabsContent>
      </Tabs>
    </main>
  );
}
