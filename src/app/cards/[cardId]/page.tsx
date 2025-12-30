
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingDown, TrendingUp, ArrowRightLeft, User, Users } from 'lucide-react';
import type { Income, Expense, BankAccount, Transfer, Category } from '@/lib/types';
import { formatCurrency, formatJalaliDate, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { USER_DETAILS } from '@/lib/constants';
import { useDashboardData } from '@/hooks/use-dashboard-data';

type Transaction = (Income | Expense | Transfer) & {
  type: 'income' | 'expense' | 'transfer';
  date: string;
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
  const { bankAccounts, incomes, expenses, transfers, categories } = allData;

  const { card, ledger } = useMemo(() => {
    if (isLoading || !cardId || !bankAccounts) {
      return { card: null, ledger: [] };
    }
    
    const currentCard = bankAccounts.find((c) => c.id === cardId);
    if (!currentCard) {
      return { card: null, ledger: [] };
    }

    const relatedIncomes = (incomes || []).filter(i => i.bankAccountId === cardId).map(i => ({...i, type: 'income' as const, date: i.date}));
    const relatedExpenses = (expenses || []).filter(e => e.bankAccountId === cardId).map(e => ({...e, type: 'expense' as const, date: e.date}));
    const relatedTransfers = (transfers || [])
      .filter(t => t.fromBankAccountId === cardId || t.toBankAccountId === cardId)
      .map(t => ({...t, type: 'transfer' as const, date: t.transferDate}));

    const combinedLedger = [...relatedIncomes, ...relatedExpenses, ...relatedTransfers]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { card: currentCard, ledger: combinedLedger };
  }, [isLoading, cardId, bankAccounts, incomes, expenses, transfers]);

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
    const expense = tx as Expense;
    return categories?.find(c => c.id === expense.categoryId)?.name || 'متفرقه';
  }

  const getExpenseForBadge = (tx: Expense) => {
    if (tx.type !== 'expense' || !tx.expenseFor || tx.expenseFor === 'shared' || card.ownerId !== 'shared_account') return null;

    let text: string;
    let Icon: React.ElementType;

    if (tx.expenseFor === 'ali') {
      text = USER_DETAILS.ali.firstName;
      Icon = User;
    } else {
      text = USER_DETAILS.fatemeh.firstName;
      Icon = User;
    }
    
    return <Badge variant="secondary" className="font-normal"><Icon className="ml-1 h-3 w-3"/>{text}</Badge>;
  }

  const getTransactionIcon = (tx: Transaction) => {
      let isDebit = false;
      if (tx.type === 'expense') isDebit = true;
      if (tx.type === 'transfer') isDebit = (tx as Transfer).fromBankAccountId === cardId;
      
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
      let isDebit = false;
      if (tx.type === 'expense') isDebit = true;
      if (tx.type === 'transfer') isDebit = (tx as Transfer).fromBankAccountId === cardId;
      
      if (tx.type === 'transfer') {
        if (isDebit) return 'text-red-600';
        return 'text-emerald-600';
      }
      if (isDebit) return 'text-red-600';
      return 'text-emerald-600';
  }

  const getTransactionAmountPrefix = (tx: Transaction) => {
      let isDebit = false;
      if (tx.type === 'expense') isDebit = true;
      if (tx.type === 'transfer') isDebit = (tx as Transfer).fromBankAccountId === cardId;

      if (isDebit) return '-';
      return '+';
  }

  const getTransactionDescription = (tx: Transaction): string => {
      if (tx.type === 'transfer') {
        const transfer = tx as Transfer;
        const isOutgoing = transfer.fromBankAccountId === cardId;
        const otherAccount = isOutgoing 
            ? bankAccounts.find(b => b.id === transfer.toBankAccountId) 
            : bankAccounts.find(b => b.id === transfer.fromBankAccountId);
        
        if (isOutgoing) return `انتقال به ${otherAccount?.bankName || 'حساب دیگر'}`;
        return `انتقال از ${otherAccount?.bankName || 'حساب دیگر'}`;
      }
      return tx.description;
  }

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="space-y-1">
              <h1 className="font-headline text-3xl font-bold tracking-tight">
                تاریخچه تراکنش‌های {card.bankName}
              </h1>
              <p className="text-muted-foreground">
                آخرین موجودی: {formatCurrency(card.balance, 'IRT')}
              </p>
            </div>
        </div>
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
                <div className="flex items-center gap-4 flex-grow">
                     {getTransactionIcon(tx)}
                     <div className="flex-grow">
                        <p className="font-bold flex items-center gap-2">
                          {getTransactionDescription(tx)}
                          {tx.type === 'expense' && getExpenseForBadge(tx as Expense)}
                        </p>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{formatJalaliDate(new Date(tx.date))}</span>
                            <Separator orientation="vertical" className="h-3" />
                            <Badge variant="outline">{getCategoryName(tx)}</Badge>
                        </div>
                     </div>
                </div>

                <div className="font-mono font-semibold text-lg md:text-xl" dir="ltr">
                    <span className={getTransactionAmountClass(tx)}>
                        {getTransactionAmountPrefix(tx)}{formatCurrency(tx.amount, 'IRT')}
                    </span>
                </div>
            </CardContent>
          </Card>
        )))}
      </div>
    </main>
  );
}
