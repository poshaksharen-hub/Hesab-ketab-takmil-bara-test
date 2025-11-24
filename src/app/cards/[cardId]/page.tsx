
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

type Transaction = (Omit<Income, 'date'> | Omit<Expense, 'date'> | Omit<Transfer, 'transferDate'>) & {
  type: 'income' | 'expense' | 'transfer';
  date: string;
};


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
  const { incomes, expenses, transfers, bankAccounts, categories } = allData;

  const { card, ledger } = useMemo(() => {
    if (isLoading || !cardId) {
      return { card: null, ledger: [] };
    }

    const cardAccount = bankAccounts.find((acc) => acc.id === cardId);
    if (!cardAccount) {
      return { card: null, ledger: [] };
    }
    
    const cardTransfers: Transaction[] = transfers
      .filter(t => t.fromBankAccountId === cardId || t.toBankAccountId === cardId)
      .map(t => {
          const isDebit = t.fromBankAccountId === cardId;
          const toAccount = bankAccounts.find(b => b.id === t.toBankAccountId);
          const fromAccount = bankAccounts.find(b => b.id === t.fromBankAccountId);
          const { transferDate, ...restOfT } = t;

          return {
              ...restOfT,
              type: 'transfer' as const,
              date: transferDate, // Use 'date' property consistently
              amount: t.amount,
              description: isDebit 
                ? `انتقال به ${toAccount?.bankName || 'ناشناس'}`
                : `دریافت از ${fromAccount?.bankName || 'ناشناس'}`,
          };
      });

    const cardIncomes: Transaction[] = incomes.filter(t => t.bankAccountId === cardId);
    const cardExpenses: Transaction[] = expenses.filter(t => t.bankAccountId === cardId);

    // Combine all transactions and sort them by date descending (most recent first)
    const allTransactions: Transaction[] = [
      ...cardIncomes,
      ...cardExpenses,
      ...cardTransfers,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate running balance starting from the most recent transaction
    let runningBalance = cardAccount.balance;
    const ledgerWithBalances: TransactionWithBalances[] = [];
    
    for (const tx of allTransactions) {
      const balanceAfter = runningBalance;
      let balanceBefore;

      const isDebit = tx.type === 'expense' || (tx.type === 'transfer' && tx.fromBankAccountId === cardId);

      if (isDebit) {
          balanceBefore = runningBalance + tx.amount;
      } else { // isCredit (income or incoming transfer)
          balanceBefore = runningBalance - tx.amount;
      }
      
      ledgerWithBalances.push({ ...tx, balanceBefore, balanceAfter });
      runningBalance = balanceBefore; // Update running balance for the next older transaction
    }
    
    return { card: cardAccount, ledger: ledgerWithBalances };
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
    if (tx.type === 'expense' && 'categoryId' in tx && tx.categoryId) {
        return categories?.find(c => c.id === tx.categoryId)?.name || 'متفرقه';
    }
    return 'متفرقه';
  }

  const getTransactionIcon = (tx: Transaction) => {
      const isDebit = tx.type === 'expense' || (tx.type === 'transfer' && tx.fromBankAccountId === cardId);
      
      if (tx.type === 'transfer') {
        return <div className="p-2 rounded-full bg-opacity-10 bg-blue-500"><ArrowRightLeft className="h-5 w-5 text-blue-500" /></div>;
      }
      if (isDebit) {
          return <div className="p-2 rounded-full bg-opacity-10 bg-red-500"><TrendingDown className="h-5 w-5 text-red-500" /></div>;
      } else { // isCredit
          return <div className="p-2 rounded-full bg-opacity-10 bg-emerald-500"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>;
      }
  };

  const getTransactionAmountClass = (tx: Transaction) => {
      const isDebit = tx.type === 'expense' || (tx.type === 'transfer' && tx.fromBankAccountId === cardId);
      if (tx.type === 'transfer') return 'text-blue-600';
      if (isDebit) return 'text-red-600';
      return 'text-emerald-600';
  }

  const getTransactionAmountPrefix = (tx: Transaction) => {
      if (tx.type === 'transfer') return tx.fromBankAccountId === cardId ? '-' : '+';
      const isDebit = tx.type === 'expense';
      if (isDebit) return '-';
      return '+';
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
          <Card key={`${tx.id}-${tx.type}`} className="overflow-hidden relative">
            <div className={cn("border-l-4 h-full absolute left-0 top-0", getTransactionAmountClass(tx))}></div>
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                {/* Transaction Details */}
                <div className="flex items-center gap-4 flex-grow">
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
                <div className="grid grid-cols-3 gap-2 text-center md:text-left text-sm md:w-auto w-full pt-2 md:pt-0">
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
