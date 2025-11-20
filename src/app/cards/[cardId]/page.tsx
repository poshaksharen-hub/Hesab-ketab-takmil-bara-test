
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { Income, Expense, BankAccount } from '@/lib/types';
import { formatCurrency, formatJalaliDate, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type TransactionWithBalances = (Income | Expense) & {
  balanceBefore: number;
  balanceAfter: number;
};

function TransactionLedgerSkeleton() {
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-6 w-48" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

export default function CardTransactionsPage() {
  const router = useRouter();
  const params = useParams();
  const cardId = params.cardId as string;

  const { isLoading, allData } = useDashboardData();
  const { incomes, expenses, bankAccounts, categories, users } = allData;

  const { card, ledger } = useMemo(() => {
    if (isLoading || !cardId) {
      return { card: null, ledger: [] };
    }

    const cardAccount = bankAccounts.find((acc) => acc.id === cardId);
    if (!cardAccount) {
      return { card: null, ledger: [] };
    }

    const cardTransactions = [
      ...incomes.filter((t) => t.bankAccountId === cardId),
      ...expenses.filter((t) => t.bankAccountId === cardId),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let currentBalance = cardAccount.balance;
    const ledgerWithBalances: TransactionWithBalances[] = [];

    for (const tx of cardTransactions) {
      const balanceAfter = currentBalance;
      let balanceBefore: number;

      if (tx.type === 'income') {
        balanceBefore = currentBalance - tx.amount;
      } else { // expense
        balanceBefore = currentBalance + tx.amount;
      }

      ledgerWithBalances.push({ ...tx, balanceBefore, balanceAfter });
      currentBalance = balanceBefore;
    }

    return { card: cardAccount, ledger: ledgerWithBalances };
  }, [isLoading, cardId, incomes, expenses, bankAccounts]);

  if (isLoading) {
    return <TransactionLedgerSkeleton />;
  }

  if (!card) {
    return (
      <main className="flex-1 p-4 pt-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>کارت بانکی یافت نشد</CardTitle>
          </CardHeader>
          <CardContent>
            <p>متاسفانه کارتی با این مشخصات در سیستم وجود ندارد.</p>
            <Button onClick={() => router.push('/cards')} className="mt-4">
              بازگشت به لیست کارت‌ها
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const getCategoryName = (id?: string) => {
    if (!id) return 'متفرقه';
    if (id === 'درآمد') return 'درآمد';
    return categories?.find(c => c.id === id)?.name || 'متفرقه';
  }

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            تاریخچه تراکنش‌های {card.bankName}
          </h1>
          <p className="text-muted-foreground">
            آخرین موجودی: {formatCurrency(card.balance, 'IRT')}
          </p>
        </div>
        <Button onClick={() => router.push('/cards')} variant="outline">
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به کارت‌ها
        </Button>
      </div>

      <div className="space-y-3">
        {ledger.length === 0 ? (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    هیچ تراکنشی برای این کارت ثبت نشده است.
                </CardContent>
            </Card>
        ) : (
        ledger.map((tx) => (
          <Card key={tx.id} className="overflow-hidden">
            <div className={cn("border-l-4 h-full absolute left-0 top-0", tx.type === 'income' ? 'border-emerald-500' : 'border-red-500')}></div>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                {/* Transaction Details */}
                <div className="md:col-span-2 flex items-center gap-4">
                     <div className={cn("p-2 rounded-full bg-opacity-10", tx.type === 'income' ? 'bg-emerald-500' : 'bg-red-500')}>
                        {tx.type === 'income' ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
                     </div>
                     <div className="flex-grow">
                        <p className="font-bold">{tx.description}</p>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{formatJalaliDate(new Date(tx.date))}</span>
                            <Separator orientation="vertical" className="h-3" />
                            <Badge variant="outline">{getCategoryName('categoryId' in tx ? tx.categoryId : 'درآمد')}</Badge>
                        </div>
                     </div>
                </div>

                {/* Amounts */}
                <div className="md:col-span-1 grid grid-cols-3 gap-2 text-center md:text-left text-sm">
                    <div className="space-y-1 p-2 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">موجودی قبل</p>
                        <p className="font-mono font-semibold">{formatCurrency(tx.balanceBefore, 'IRT')}</p>
                    </div>
                     <div className="space-y-1 p-2 rounded-md bg-muted/50">
                        <p className={cn("text-xs font-bold", tx.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>مبلغ تراکنش</p>
                        <p className={cn("font-mono font-semibold", tx.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                            {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount, 'IRT')}
                        </p>
                    </div>
                     <div className="space-y-1 p-2 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">موجودی بعد</p>
                        <p className="font-mono font-semibold">{formatCurrency(tx.balanceAfter, 'IRT')}</p>
                    </div>
                </div>

            </CardContent>
          </Card>
        )))}
      </div>
    </main>
  );
}
