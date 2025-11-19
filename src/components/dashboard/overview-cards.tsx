'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import React from 'react';

type OverviewCardsProps = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
};

export function OverviewCards({ totalIncome, totalExpenses, balance }: OverviewCardsProps) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">درآمد ماه جاری</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalIncome, 'IRT')}</div>
          <p className="text-xs text-muted-foreground">درآمد شما در این ماه</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">هزینه ماه جاری</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalExpenses, 'IRT')}</div>
          <p className="text-xs text-muted-foreground">هزینه‌های شما در این ماه</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">موجودی کل</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(balance, 'IRT')}</div>
          <p className="text-xs text-muted-foreground">مجموع موجودی در تمام حساب‌ها</p>
        </CardContent>
      </Card>
    </>
  );
}
