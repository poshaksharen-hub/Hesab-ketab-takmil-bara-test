
'use client';
import React, { useMemo } from 'react';
import { InsightsGenerator } from '@/components/insights/insights-generator';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { type FinancialInsightsInput } from '@/ai/flows/generate-financial-insights';
import { USER_DETAILS } from '@/lib/constants';


export default function InsightsPage() {
  const { isLoading, allData } = useDashboardData();

  const financialData = useMemo((): FinancialInsightsInput | null => {
    if (isLoading || !allData) return null;

    const { incomes, expenses, bankAccounts, categories, payees, users, checks, loans, previousDebts } = allData;
    
    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'نامشخص';
    const getPayeeName = (id: string) => payees.find(p => p.id === id)?.name || 'نامشخص';
    const getBankAccountName = (id: string) => {
        const account = bankAccounts.find(b => b.id === id);
        if (!account) return 'نامشخص';
        const ownerName = account.ownerId === 'shared' ? 'مشترک' : USER_DETAILS[account.ownerId]?.firstName || 'ناشناس';
        return `${account.bankName} (${ownerName})`;
    };
    const getUserName = (id: string) => users.find(u => u.id === id)?.firstName || 'ناشناس';
    
    const enrichedIncomes = incomes.map(income => ({
        ...income,
        bankAccountName: getBankAccountName(income.bankAccountId),
        registeredBy: getUserName(income.registeredByUserId),
    }));

    const enrichedExpenses = expenses.map(expense => ({
        ...expense,
        bankAccountName: getBankAccountName(expense.bankAccountId),
        categoryName: getCategoryName(expense.categoryId),
        payeeName: expense.payeeId ? getPayeeName(expense.payeeId) : undefined,
        registeredBy: getUserName(expense.registeredByUserId),
        expenseFor: expense.expenseFor ? USER_DETAILS[expense.expenseFor]?.firstName || 'مشترک' : 'مشترک'
    }));

    const enrichedChecks = checks.filter(c => c.status === 'pending').map(check => ({
        ...check,
        payeeName: getPayeeName(check.payeeId),
        bankAccountName: getBankAccountName(check.bankAccountId),
    }));

    const enrichedLoans = loans.filter(l => l.remainingAmount > 0).map(loan => ({
        ...loan,
        payeeName: loan.payeeId ? getPayeeName(loan.payeeId) : 'نامشخص',
    }));

    const enrichedDebts = previousDebts.filter(d => d.remainingAmount > 0).map(debt => ({
        ...debt,
        payeeName: getPayeeName(debt.payeeId),
    }));


    return {
      incomes: enrichedIncomes,
      expenses: enrichedExpenses,
      bankAccounts,
      checks: enrichedChecks,
      loans: enrichedLoans,
      previousDebts: enrichedDebts,
    };
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
        <InsightsGenerator financialData={financialData} />
      )}
    </main>
  );
}
