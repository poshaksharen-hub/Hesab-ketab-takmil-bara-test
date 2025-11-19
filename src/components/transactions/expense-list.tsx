'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Expense, BankAccount, Category, UserProfile } from '@/lib/types';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ExpenseListProps {
  expenses: Expense[];
  bankAccounts: BankAccount[];
  categories: Category[];
  users: UserProfile[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseList({ expenses, bankAccounts, categories, users, onEdit, onDelete }: ExpenseListProps) {
  const getBankAccountName = (id: string) => bankAccounts.find(acc => acc.id === id)?.bankName || 'نامشخص';
  const getCategoryName = (id: string) => categories.find(cat => cat.id === id)?.name || 'نامشخص';
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.firstName || 'نامشخص';


  if (expenses.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">لیست هزینه‌ها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ هزینه‌ای برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <TooltipProvider>
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">لیست هزینه‌ها</CardTitle>
        <CardDescription>هزینه‌های ثبت شده اخیر شما در اینجا نمایش داده می‌شود.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>شرح</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead>تاریخ</TableHead>
              <TableHead>دسته‌بندی</TableHead>
              <TableHead>ثبت توسط</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">{expense.description}</TableCell>
                <TableCell>{formatCurrency(expense.amount, 'IRT')}</TableCell>
                <TableCell>{formatJalaliDate(new Date(expense.date))}</TableCell>
                <TableCell>
                    <Badge variant="outline">{getCategoryName(expense.categoryId)}</Badge>
                </TableCell>
                <TableCell>{getUserName(expense.registeredByUserId)}</TableCell>
                <TableCell className="text-left">
                    <div className='flex gap-2 justify-end'>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className='inline-flex'>
                                <Button variant="ghost" size="icon" onClick={() => onEdit(expense)} disabled={!!expense.checkId || !!expense.loanPaymentId}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                </div>
                            </TooltipTrigger>
                            {(!!expense.checkId || !!expense.loanPaymentId) && (
                                <TooltipContent>
                                    <p>این هزینه به صورت خودکار ثبت شده و قابل ویرایش نیست.</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <div className='inline-flex'>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!!expense.checkId || !!expense.loanPaymentId}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>آیا از حذف این هزینه مطمئن هستید؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    این عمل قابل بازگشت نیست. مبلغ هزینه به حساب شما بازگردانده خواهد شد.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(expense)}>
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
    </TooltipProvider>
  );
}
