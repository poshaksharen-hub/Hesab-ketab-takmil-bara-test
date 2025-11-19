'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Landmark, Scale, PiggyBank } from 'lucide-react';
import React from 'react';

type OverallSummaryProps = {
  summary: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
  };
};

export function OverallSummary({ summary }: OverallSummaryProps) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">دارایی خالص</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.netWorth, 'IRT')}</div>
          <p className="text-xs text-muted-foreground">تفاضل کل دارایی و بدهی</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">کل دارایی</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.totalAssets, 'IRT')}</div>
          <p className="text-xs text-muted-foreground">موجودی کل حساب‌های بانکی</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">کل بدهی</CardTitle>
          <Landmark className="h-4 w-4 text-muted-foreground text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalLiabilities, 'IRT')}</div>
          <p className="text-xs text-muted-foreground">چک‌های پاس نشده و وام‌های باقی‌مانده</p>
        </CardContent>
      </Card>
    </>
  );
}
