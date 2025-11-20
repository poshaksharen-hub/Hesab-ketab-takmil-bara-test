
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Check, BankAccount, Payee } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface CheckListProps {
  checks: Check[];
  bankAccounts: BankAccount[];
  payees: Payee[];
  onEdit: (check: Check) => void;
  onDelete: (check: Check) => void;
  onClear: (check: Check) => void;
}

export function CheckList({ checks, bankAccounts, payees, onEdit, onDelete, onClear }: CheckListProps) {
  const getBankAccountName = (id: string) => bankAccounts.find(acc => acc.id === id)?.bankName || 'نامشخص';
  const getPayeeName = (id: string) => payees.find(p => p.id === id)?.name || 'نامشخص';

  const getStatusBadge = (status: 'pending' | 'cleared', dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'pending';
    if (isOverdue) return <Badge variant="destructive">سررسید گذشته</Badge>;
    if (status === 'pending') return <Badge variant="secondary">در انتظار پاس</Badge>;
    return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">پاس شده</Badge>;
  };
  
  if (checks.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">لیست چک‌ها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ چکی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <TooltipProvider>
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">لیست چک‌ها</CardTitle>
        <CardDescription>چک‌های صادر شده اخیر شما در اینجا نمایش داده می‌شود.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>طرف حساب</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead>تاریخ سررسید</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).map((check) => (
              <TableRow key={check.id} className={cn(check.status === 'cleared' && 'text-muted-foreground opacity-70')}>
                <TableCell className="font-medium">{getPayeeName(check.payeeId)}</TableCell>
                <TableCell>{formatCurrency(check.amount, 'IRT')}</TableCell>
                <TableCell>{formatJalaliDate(new Date(check.dueDate))}</TableCell>
                <TableCell>{getStatusBadge(check.status, check.dueDate)}</TableCell>
                <TableCell className="text-left">
                    <div className='flex gap-1 justify-end'>
                        {check.status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" title="پاس کردن چک">
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>آیا از پاس کردن این چک مطمئن هستید؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    مبلغ چک از حساب شما کسر و یک هزینه متناظر ثبت خواهد شد. این عملیات غیرقابل بازگشت است.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onClear(check)}>
                                    بله، پاس کن
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        )}
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
