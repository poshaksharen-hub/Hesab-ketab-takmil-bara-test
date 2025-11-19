'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import React from 'react';

type OverviewCardsProps = {
  transactions: Transaction[];
};

export function OverviewCards({ transactions }: OverviewCardsProps) {
  const { totalIncome, totalExpenses, balance } = React.useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    });
    const balance = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, balance };
  }, [transactions]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">مجموع درآمد</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
          <p className="text-xs text-muted-foreground">در ۳۰ روز گذشته</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">مجموع هزینه‌ها</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          <p className="text-xs text-muted-foreground">در ۳۰ روز گذشته</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">موجودی</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
          <p className="text-xs text-muted-foreground">موجودی فعلی شما</p>
        </CardContent>
      </Card>
    </>
  );
}
