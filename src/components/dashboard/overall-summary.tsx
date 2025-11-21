
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Landmark, Scale, PiggyBank, Handshake, FileText } from 'lucide-react';
import React from 'react';

type OverallSummaryProps = {
  summary: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    totalIncome: number;
    totalExpense: number;
    pendingChecksAmount: number;
    remainingLoanAmount: number;
    remainingDebtsAmount: number;
  };
};

export function OverallSummary({ summary }: OverallSummaryProps) {
  return (
    <>
      <div className='lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4'>
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
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalAssets, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">موجودی کل حساب‌های بانکی</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل درآمد</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.totalIncome, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">در بازه زمانی انتخاب شده</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل هزینه</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalExpense, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">در بازه زمانی انتخاب شده</p>
          </CardContent>
        </Card>
      </div>
       <div className='lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بدهی وام‌ها</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.remainingLoanAmount, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">مبلغ باقی‌مانده وام‌ها</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بدهی چک‌ها</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.pendingChecksAmount, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">مجموع چک‌های پاس نشده</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بدهی‌های متفرقه</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.remainingDebtsAmount, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">بدهی‌های ثبت شده به افراد</p>
            </CardContent>
        </Card>
       </div>
    </>
  );
}

    