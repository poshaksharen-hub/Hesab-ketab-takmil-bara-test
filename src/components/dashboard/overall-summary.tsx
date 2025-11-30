
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Landmark, Scale, PiggyBank, Handshake, FileText } from 'lucide-react';
import React from 'react';

type SummaryData = {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalIncome: number;
  totalExpense: number;
  pendingChecksAmount: number;
  remainingLoanAmount: number;
  remainingDebtsAmount: number;
};


type OverallSummaryProps = {
  filteredSummary: SummaryData;
  globalSummary: Pick<SummaryData, 'netWorth' | 'totalAssets' | 'pendingChecksAmount' | 'remainingLoanAmount' | 'remainingDebtsAmount'>;
};

export function OverallSummary({ filteredSummary, globalSummary }: OverallSummaryProps) {
  return (
    <>
      <div className='lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">دارایی خالص</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filteredSummary.netWorth, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">تفاضل دارایی و بدهی (فیلتر شده)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل دارایی</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filteredSummary.totalAssets, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">موجودی حساب‌های بانکی (فیلتر شده)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل درآمد</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{formatCurrency(filteredSummary.totalIncome, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">در بازه زمانی انتخاب شده</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل هزینه</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(filteredSummary.totalExpense, 'IRT')}</div>
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
            <div className="text-2xl font-bold">{formatCurrency(globalSummary.remainingLoanAmount, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">کل مبلغ باقی‌مانده وام‌ها</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بدهی چک‌ها</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(globalSummary.pendingChecksAmount, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">کل چک‌های پاس نشده</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بدهی‌های متفرقه</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(globalSummary.remainingDebtsAmount, 'IRT')}</div>
            <p className="text-xs text-muted-foreground">کل بدهی‌های ثبت شده به افراد</p>
            </CardContent>
        </Card>
       </div>
    </>
  );
}
