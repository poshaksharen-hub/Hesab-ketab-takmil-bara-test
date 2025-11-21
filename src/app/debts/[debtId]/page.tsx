
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Handshake } from 'lucide-react';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { USER_DETAILS } from '@/lib/constants';

function DebtDetailSkeleton() {
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-28" />
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent>
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function DebtDetailPage() {
  const router = useRouter();
  const params = useParams();
  const debtId = params.debtId as string;

  const { isLoading, allData } = useDashboardData();
  const { previousDebts, debtPayments, bankAccounts, payees } = allData;

  const { debt, paymentHistory } = useMemo(() => {
    if (isLoading || !debtId) {
      return { debt: null, paymentHistory: [] };
    }

    const currentDebt = previousDebts.find((d) => d.id === debtId);
    if (!currentDebt) return { debt: null, paymentHistory: [] };

    const relatedPayments = debtPayments
        .filter(p => p.debtId === debtId)
        .map(p => {
            const bankAccount = bankAccounts.find(b => b.id === p.bankAccountId);
            const ownerId = bankAccount?.ownerId;
            const ownerName = ownerId === 'shared' ? 'حساب مشترک' : (ownerId && USER_DETAILS[ownerId] ? `${USER_DETAILS[ownerId].firstName}` : 'ناشناس');
            return {
                ...p,
                bankName: bankAccount?.bankName || 'نامشخص',
                ownerName,
            }
        })
        .sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    return {
      debt: currentDebt,
      paymentHistory: relatedPayments,
    };
  }, [isLoading, debtId, previousDebts, debtPayments, bankAccounts]);

  if (isLoading) {
    return <DebtDetailSkeleton />;
  }

  if (!debt) {
    return (
      <main className="flex-1 p-4 pt-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>بدهی یافت نشد</CardTitle>
          </CardHeader>
          <CardContent>
            <p>متاسفانه بدهی با این مشخصات در سیستم وجود ندارد.</p>
            <Button onClick={() => router.push('/debts')} className="mt-4">
              بازگشت به لیست بدهی‌ها
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const getPayeeName = (payeeId?: string) => {
    if (!payeeId) return 'نامشخص';
    return payees.find(p => p.id === payeeId)?.name || 'نامشخص';
  };

  const progress = 100 - (debt.remainingAmount / debt.amount) * 100;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            جزئیات بدهی: {debt.description}
          </h1>
          <p className="text-muted-foreground">
            بدهی به: {getPayeeName(debt.payeeId)}
          </p>
        </div>
        <Button onClick={() => router.push('/debts')} variant="outline">
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به لیست
        </Button>
      </div>

       <Card>
            <CardContent className='pt-6'>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                        <span>{formatCurrency(debt.amount - debt.remainingAmount, 'IRT')}</span>
                        <span>{formatCurrency(debt.amount, 'IRT')}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground text-center">
                        <span>{`${progress.toFixed(0)}٪ پرداخت شده`}</span>
                        <span>مبلغ باقی‌مانده: <span className='font-bold'>{formatCurrency(debt.remainingAmount, 'IRT')}</span></span>
                    </div>
                </div>
            </CardContent>
       </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>تاریخچه پرداخت‌ها</CardTitle>
          </CardHeader>
          <CardContent>
               <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>تاریخ پرداخت</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>برداشت از حساب</TableHead>
                    <TableHead className="text-left">صاحب حساب</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paymentHistory.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                هیچ پرداختی برای این بدهی ثبت نشده است.
                            </TableCell>
                        </TableRow>
                    ) : (
                    paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                        <TableCell>{formatJalaliDate(new Date(payment.paymentDate))}</TableCell>
                        <TableCell className="font-medium font-mono">{formatCurrency(payment.amount, 'IRT')}</TableCell>
                        <TableCell>{payment.bankName}</TableCell>
                        <TableCell className="text-left">{payment.ownerName}</TableCell>
                    </TableRow>
                    )))}
                </TableBody>
                </Table>
          </CardContent>
      </Card>
    </main>
  );
}

    