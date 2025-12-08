
'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Sparkles, BrainCircuit, Loader2, AlertTriangle } from 'lucide-react';
import { getFinancialInsightsAction, type FinancialInsightsInput, type FinancialInsightsOutput } from './actions';
import { USER_DETAILS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function InsightsPage() {
  const { user } = useUser();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();
  const [insights, setInsights] = useState<FinancialInsightsOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const financialData = useMemo<FinancialInsightsInput | null>(() => {
    if (isDashboardLoading || !allData || !user) return null;

    const { incomes, expenses, bankAccounts, checks, loans, previousDebts, goals, payees, categories } = allData;
    
    return {
      currentUserName: user.email?.startsWith('ali') ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName,
      incomes: incomes.map(i => ({
        description: i.description,
        amount: i.amount,
        date: i.date,
        bankAccountName: bankAccounts.find(b => b.id === i.bankAccountId)?.bankName || 'نامشخص',
        source: i.source,
      })),
      expenses: expenses.map(e => ({
        description: e.description,
        amount: e.amount,
        date: e.date,
        bankAccountName: bankAccounts.find(b => b.id === e.bankAccountId)?.bankName || 'نامشخص',
        categoryName: categories.find(c => c.id === e.categoryId)?.name || 'نامشخص',
        payeeName: payees.find(p => p.id === e.payeeId)?.name,
        expenseFor: e.expenseFor,
      })),
      bankAccounts: bankAccounts.map(b => ({
        bankName: b.bankName,
        balance: b.balance,
        ownerId: b.ownerId,
      })),
      checks: checks.filter(c => c.status === 'pending').map(c => ({
        description: c.description,
        amount: c.amount,
        dueDate: c.dueDate,
        payeeName: payees.find(p => p.id === c.payeeId)?.name || 'نامشخص',
        bankAccountName: bankAccounts.find(b => b.id === c.bankAccountId)?.bankName || 'نامشخص',
      })),
      loans: loans.filter(l => l.remainingAmount > 0).map(l => ({
        title: l.title,
        remainingAmount: l.remainingAmount,
        installmentAmount: l.installmentAmount,
        payeeName: payees.find(p => p.id === l.payeeId)?.name || 'نامشخص',
      })),
      previousDebts: previousDebts.filter(d => d.remainingAmount > 0).map(d => ({
        description: d.description,
        remainingAmount: d.remainingAmount,
        payeeName: payees.find(p => p.id === d.payeeId)?.name || 'نامشخص',
      })),
      financialGoals: goals.map(g => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
        priority: g.priority,
        isAchieved: g.isAchieved,
      })),
    };
  }, [isDashboardLoading, allData, user]);

  const handleGenerate = () => {
    if (isPending || !financialData) return;

    setError(null);
    setInsights(null);
    
    startTransition(async () => {
      const result = await getFinancialInsightsAction(financialData);
      if (result.success && result.data) {
        setInsights(result.data);
      } else {
        setError(result.error || 'یک خطای ناشناخته رخ داد.');
      }
    });
  };

  if (isDashboardLoading || !financialData) {
      return (
        <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Card className="mt-4">
              <CardHeader>
                <Skeleton className="h-6 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-48" />
              </CardContent>
            </Card>
        </main>
      )
  }

  return (
    <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="space-y-1">
            <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-primary" />
                تحلیل هوشمند مالی
            </h1>
            <p className="text-muted-foreground">
                از قدرت هوش مصنوعی برای تحلیل عادت‌های مالی و دریافت پیشنهادهای شخصی‌سازی شده استفاده کنید.
            </p>
        </div>
      
       <Card className="bg-secondary/50">
          <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                  <BrainCircuit className="size-6 text-primary" />
              </div>
              <div>
                  <CardTitle className="font-headline">تحلیل وضعیت مالی</CardTitle>
                  <CardDescription>
                      برای پردازش داده‌های مالی اخیر و دریافت خلاصه و پیشنهادهای هوش مصنوعی، روی دکمه زیر کلیک کنید.
                  </CardDescription>
              </div>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال تحلیل...
                </>
              ) : (
                <>
                  <Sparkles className="ml-2 h-4 w-4" />
                  دریافت تحلیل کلی
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {isPending && (
          <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        )}

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>خطا در پردازش</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {insights && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">تحلیل و پیشنهادها</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{insights.summary}</p>
              </CardContent>
            </Card>
        )}
    </main>
  );
}
