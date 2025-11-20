
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingDown, TrendingUp, ArrowRightLeft } from 'lucide-react';
import type { Income, Expense, BankAccount, Transfer } from '@/lib/types';
import { formatCurrency, formatJalaliDate, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type Transaction = (Income | Expense | Transfer) & { type: 'income' | 'expense' | 'transfer' };

type TransactionWithBalances = Transaction & {
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
  const { incomes, expenses, transfers, bankAccounts, categories, users } = allData;

  const { card, ledger } = useMemo(() => {
    if (isLoading || !cardId) {
      return { card: null, ledger: [] };
    }

    const cardAccount = bankAccounts.find((acc) => acc.id === cardId);
    if (!cardAccount) {
      return { card: null, ledger: [] };
    }
    
    // Standardize transfers to look like transactions for this card
    const cardTransfers = transfers
      .filter(t => t.fromBankAccountId === cardId || t.toBankAccountId === cardId)
      .map(t => {
          const isDebit = t.fromBankAccountId === cardId; // Money is leaving
          const toAccount = bankAccounts.find(b => b.id === t.toBankAccountId);
          const fromAccount = bankAccounts.find(b => b.id === t.fromBankAccountId);

          return {
              ...t,
              type: 'transfer' as 'transfer',
              date: t.transferDate,
              amount: t.amount,
              description: isDebit 
                ? `انتقال به ${toAccount?.bankName || 'ناشناس'}`
                : `دریافت از ${fromAccount?.bankName || 'ناشناس'}`,
              balanceBefore: isDebit ? t.fromAccountBalanceBefore : t.toAccountBalanceBefore,
              balanceAfter: isDebit ? t.fromAccountBalanceAfter : t.toAccountBalanceAfter,
          };
      });

    const cardIncomes = incomes
        .filter(t => t.bankAccountId === cardId)
        .map(i => ({...i, type: 'income' as 'income'}));

    const cardExpenses = expenses
        .filter(t => t.bankAccountId === cardId)
        .map(e => ({...e, type: 'expense' as 'expense'}));

    const allTransactions = [
      ...cardIncomes,
      ...cardExpenses,
      ...cardTransfers,
    ].sort((a, b) => {
        const dateA = a.type === 'transfer' ? new Date(a.transferDate) : new Date(a.date);
        const dateB = b.type === 'transfer' ? new Date(b.transferDate) : new Date(b.date);
        if (dateA.getTime() === dateB.getTime()) {
            // If dates are identical, we need a tie-breaker.
            // Let's assume transfers happen 'after' income/expense for ordering purposes.
            if (a.type === 'transfer' && b.type !== 'transfer') return -1;
            if (a.type !== 'transfer' && b.type === 'transfer') return 1;
        }
        return dateB.getTime() - dateA.getTime();
    });

    let currentBalance = cardAccount.balance;
    const ledgerWithBalances: TransactionWithBalances[] = [];

    for (const tx of allTransactions) {
      if (tx.type === 'transfer' || (tx.type === 'expense' && tx.balanceAfter !== undefined && tx.balanceBefore !== undefined)) {
          // Balances are pre-calculated for transfers and check-related expenses
          ledgerWithBalances.push(tx as TransactionWithBalances);
          continue;
      }
      
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
    
    // Final sort by after-balance to ensure chronological accuracy
    return { card: cardAccount, ledger: ledgerWithBalances.sort((a, b) => b.balanceAfter - a.balanceAfter) };
  }, [isLoading, cardId, incomes, expenses, transfers, bankAccounts]);

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
  
  const getCategoryName = (tx: Transaction) => {
    if (tx.type === 'income') return 'درآمد';
    if (tx.type === 'transfer') return 'انتقال داخلی';
    if (tx.type === 'expense' && tx.categoryId) {
        return categories?.find(c => c.id === tx.categoryId)?.name || 'متفرقه';
    }
    return 'متفرقه';
  }

  const getTransactionIcon = (tx: Transaction) => {
      const isDebit = tx.type === 'expense' || (tx.type === 'transfer' && tx.fromBankAccountId === cardId);
      const isCredit = tx.type === 'income' || (tx.type === 'transfer' && tx.toBankAccountId === cardId);

      if (isCredit) {
          return <div className="p-2 rounded-full bg-opacity-10 bg-emerald-500"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>;
      }
      if (isDebit) {
          return <div className="p-2 rounded-full bg-opacity-10 bg-red-500"><TrendingDown className="h-5 w-5 text-red-500" /></div>;
      }
      return <div className="p-2 rounded-full bg-opacity-10 bg-gray-500"><ArrowRightLeft className="h-5 w-5 text-gray-500" /></div>;
  };

  const getTransactionAmountClass = (tx: Transaction) => {
      const isDebit = tx.type === 'expense' || (tx.type === 'transfer' && tx.fromBankAccountId === cardId);
      const isCredit = tx.type === 'income' || (tx.type === 'transfer' && tx.toBankAccountId === cardId);
      if (isCredit) return 'text-emerald-600';
      if (isDebit) return 'text-red-600';
      return '';
  }

  const getTransactionAmountPrefix = (tx: Transaction) => {
      const isDebit = tx.type === 'expense' || (tx.type === 'transfer' && tx.fromBankAccountId === cardId);
      const isCredit = tx.type === 'income' || (tx.type === 'transfer' && tx.toBankAccountId === cardId);
      if (isCredit) return '+';
      if (isDebit) return '-';
      return '';
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
            <div className={cn("border-l-4 h-full absolute left-0 top-0", getTransactionAmountClass(tx))}></div>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                {/* Transaction Details */}
                <div className="md:col-span-2 flex items-center gap-4">
                     {getTransactionIcon(tx)}
                     <div className="flex-grow">
                        <p className="font-bold">{tx.description}</p>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{formatJalaliDate(new Date(tx.date))}</span>
                            <Separator orientation="vertical" className="h-3" />
                            <Badge variant="outline">{getCategoryName(tx)}</Badge>
                        </div>
                     </div>
                </div>

                {/* Amounts */}
                <div className="md:col-span-1 grid grid-cols-3 gap-2 text-center md:text-left text-sm">
                    <div className="space-y-1 p-2 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">موجودی قبل</p>
                        <p className="font-mono font-semibold">{formatCurrency(tx.balanceBefore, 'IRT').replace(' تومان', '')}</p>
                    </div>
                     <div className="space-y-1 p-2 rounded-md bg-muted/50">
                        <p className={cn("text-xs font-bold", getTransactionAmountClass(tx))}>مبلغ تراکنش</p>
                        <p className={cn("font-mono font-semibold", getTransactionAmountClass(tx))}>
                            {getTransactionAmountPrefix(tx)} {formatCurrency(tx.amount, 'IRT').replace(' تومان', '')}
                        </p>
                    </div>
                     <div className="space-y-1 p-2 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">موجودی بعد</p>
                        <p className="font-mono font-semibold">{formatCurrency(tx.balanceAfter, 'IRT').replace(' تومان', '')}</p>
                    </div>
                </div>

            </CardContent>
          </Card>
        )))}
      </div>
    </main>
  );
}
