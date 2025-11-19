'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { Income, BankAccount, UserProfile } from '@/lib/types';
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
} from "@/components/ui/alert-dialog"

interface IncomeListProps {
  incomes: Income[];
  bankAccounts: BankAccount[];
  users: UserProfile[];
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
}

export function IncomeList({ incomes, bankAccounts, users, onEdit, onDelete }: IncomeListProps) {
  const getBankAccountName = (id: string) => {
    const account = bankAccounts.find(acc => acc.id === id);
    return account ? account.bankName : 'نامشخص';
  };

  const getUserName = (userId: string) => {
      const user = users.find(u => u.id === userId);
      return user ? user.firstName : 'نامشخص';
  }
  
  if (incomes.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">لیست درآمدها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ درآمدی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">لیست درآمدها</CardTitle>
        <CardDescription>درآمدهای ثبت شده اخیر شما در اینجا نمایش داده می‌شود.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>شرح</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead className="hidden md:table-cell">تاریخ</TableHead>
              <TableHead className="hidden md:table-cell">واریز به</TableHead>
              <TableHead className="hidden sm:table-cell">ثبت توسط</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((income) => (
              <TableRow key={income.id}>
                <TableCell className="font-medium">{income.description}</TableCell>
                <TableCell className='text-emerald-500 dark:text-emerald-400 font-semibold'>{formatCurrency(income.amount, 'IRT')}</TableCell>
                <TableCell className="hidden md:table-cell">{formatJalaliDate(new Date(income.date))}</TableCell>
                <TableCell className="hidden md:table-cell">{getBankAccountName(income.bankAccountId)}</TableCell>
                <TableCell className="hidden sm:table-cell">{getUserName(income.registeredByUserId)}</TableCell>
                <TableCell className="text-left">
                    <div className='flex gap-2 justify-end'>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(income)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>آیا از حذف این درآمد مطمئن هستید؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    این عمل قابل بازگشت نیست. با حذف این درآمد، مبلغ آن از موجودی حساب شما کسر خواهد شد.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(income)}>
                                    بله، حذف کن
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
