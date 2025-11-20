'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Transfer, BankAccount } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { ArrowLeftRight } from 'lucide-react';
import { USER_DETAILS } from '@/lib/constants';


interface TransferListProps {
  transfers: Transfer[];
  bankAccounts: BankAccount[];
}

export function TransferList({ transfers, bankAccounts }: TransferListProps) {
  
  const getAccountDisplayName = (id: string) => {
    const account = bankAccounts.find(acc => acc.id === id);
    if (!account) return 'نامشخص';
    if (account.ownerId === 'shared') return `${account.bankName} (مشترک)`;
    const owner = USER_DETAILS[account.ownerId];
    return `${account.bankName} (${owner?.firstName || 'ناشناس'})`;
  };
  
  if (transfers.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">تاریخچه انتقال‌ها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ انتقالی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">تاریخچه انتقال‌ها</CardTitle>
        <CardDescription>انتقال‌های اخیر شما در اینجا نمایش داده می‌شود.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>مبلغ</TableHead>
              <TableHead>از حساب</TableHead>
              <TableHead></TableHead>
              <TableHead>به حساب</TableHead>
              <TableHead>تاریخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.sort((a,b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime()).map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell className="font-medium font-mono">{formatCurrency(transfer.amount, 'IRT')}</TableCell>
                <TableCell className="text-muted-foreground">{getAccountDisplayName(transfer.fromBankAccountId)}</TableCell>
                <TableCell><ArrowLeftRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                <TableCell className="text-muted-foreground">{getAccountDisplayName(transfer.toBankAccountId)}</TableCell>
                <TableCell>{formatJalaliDate(new Date(transfer.transferDate))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
