'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Transfer, BankAccount } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { ArrowLeftRight } from 'lucide-react';


interface TransferListProps {
  transfers: Transfer[];
  bankAccounts: BankAccount[];
}

export function TransferList({ transfers, bankAccounts }: TransferListProps) {
  const getBankAccountName = (id: string) => {
    const account = bankAccounts.find(acc => acc.id === id);
    return account ? account.name : 'نامشخص';
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
              <TableHead className="hidden sm:table-cell">از حساب</TableHead>
              <TableHead className="hidden sm:table-cell"></TableHead>
              <TableHead className="hidden sm:table-cell">به حساب</TableHead>
              <TableHead className="hidden md:table-cell">تاریخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.sort((a,b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime()).map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell className="font-medium font-mono">{formatCurrency(transfer.amount, 'IRT')}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{getBankAccountName(transfer.fromBankAccountId)}</TableCell>
                <TableCell className="hidden sm:table-cell"><ArrowLeftRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{getBankAccountName(transfer.toBankAccountId)}</TableCell>
                <TableCell className="hidden md:table-cell">{formatJalaliDate(new Date(transfer.transferDate))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
