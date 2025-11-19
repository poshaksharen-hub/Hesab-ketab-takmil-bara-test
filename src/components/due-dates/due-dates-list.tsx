
'use client';

import React from 'react';
import type { Check, Loan } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { differenceInDays, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CalendarClock, HandCoins, AlertTriangle } from 'lucide-react';

export type Deadline = {
  id: string;
  type: 'check' | 'loan';
  date: Date;
  title: string;
  amount: number;
  originalItem: Check | Loan;
};

interface DueDatesListProps {
  deadlines: Deadline[];
  onAction: (item: Deadline) => void;
}

export function DueDatesList({ deadlines, onAction }: DueDatesListProps) {
  if (deadlines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>همه چیز پرداخت شده!</CardTitle>
          <CardDescription>هیچ سررسید نزدیک یا پرداخت معوقی برای شما وجود ندارد.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 flex-col items-center justify-center gap-4 text-center">
            <HandCoins className="h-16 w-16 text-emerald-500" />
            <p className="text-muted-foreground">شما هیچ تعهد مالی فعالی ندارید. آفرین!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderStatus = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    const daysDiff = differenceInDays(dueDate, today);

    if (daysDiff < 0) {
      return (
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{Math.abs(daysDiff)} روز گذشته</span>
        </div>
      );
    }
    if (daysDiff === 0) {
      return <span className="font-bold text-amber-600">امروز</span>;
    }
    return <span>{daysDiff} روز دیگر</span>;
  };

  return (
    <div className="space-y-4">
      {deadlines.map((item) => {
        const isOverdue = isPast(item.date) && differenceInDays(item.date, new Date()) < 0;
        return (
            <Card key={`${item.type}-${item.id}`} className={isOverdue ? 'border-destructive' : ''}>
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                    <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                        item.type === 'check'
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900'
                            : 'bg-sky-100 text-sky-600 dark:bg-sky-900'
                        }`}
                    >
                        {item.type === 'check' ? <FileText className="h-6 w-6" /> : <CalendarClock className="h-6 w-6" />}
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                            مبلغ: <span className="font-mono font-semibold">{formatCurrency(item.amount, 'IRT')}</span>
                        </p>
                    </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className='text-center'>
                            <p className="font-bold text-lg">{formatJalaliDate(item.date)}</p>
                            <p className="text-sm text-muted-foreground">{renderStatus(item.date)}</p>
                        </div>
                        <Button onClick={() => onAction(item)}>
                            {item.type === 'check' ? 'پاس کردن چک' : 'پرداخت قسط'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
      )})}
    </div>
  );
}

