'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, CalendarCheck2, RotateCcw } from 'lucide-react';
import type { Loan, LoanPayment, Payee } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
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
import { Badge } from '../ui/badge';
import { getNextDueDate } from '@/lib/date-utils';

interface LoanListProps {
  loans: Loan[];
  loanPayments: LoanPayment[];
  payees: Payee[];
  onEdit: (loan: Loan) => void;
  onDelete: (loanId: string) => void;
  onPay: (loan: Loan) => void;
}

export function LoanList({ loans, loanPayments, payees, onEdit, onDelete, onPay }: LoanListProps) {
  
  const getPayeeName = (payeeId?: string) => {
    if (!payeeId) return 'نامشخص';
    return payees.find(p => p.id === payeeId)?.name || 'نامشخص';
  };

  if (loans.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">لیست وام‌ها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ وامی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  const getLoanStatus = (loan: Loan) => {
    if (loan.paidInstallments >= loan.numberOfInstallments) {
      return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">تکمیل شده</Badge>;
    }
    const nextDueDate = getNextDueDate(loan.startDate, loan.paymentDay);
    const today = new Date();
    today.setHours(0,0,0,0);
    if(nextDueDate < today) {
        return <Badge variant="destructive">قسط معوق</Badge>;
    }
    return <Badge variant="secondary">در حال پرداخت</Badge>;
  };


  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {loans.sort((a, b) => a.paidInstallments - b.paidInstallments).map((loan) => {
            const progress = (loan.paidInstallments / loan.numberOfInstallments) * 100;
            const isCompleted = loan.paidInstallments >= loan.numberOfInstallments;

            return (
            <Card key={loan.id} className={cn("flex flex-col justify-between shadow-lg", isCompleted && "bg-muted/50")}>
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div className="space-y-1">
                            <CardTitle className={cn(isCompleted && "text-muted-foreground line-through")}>{loan.title}</CardTitle>
                             <CardDescription>
                                {getLoanStatus(loan)}
                                {loan.payeeId && <span className="mr-2 text-xs">(از: {getPayeeName(loan.payeeId)})</span>}
                            </CardDescription>
                        </div>
                        <div className="flex gap-1">
                            {!isCompleted && (
                                <Button variant="ghost" size="icon" onClick={() => onEdit(loan)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>آیا از حذف این وام مطمئن هستید؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        این عمل تمام سوابق پرداخت و هزینه‌های مربوط به این وام را نیز حذف خواهد کرد. این عملیات غیرقابل بازگشت است.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>انصراف</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(loan.id)}>
                                        بله، حذف کن
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{formatCurrency(loan.remainingAmount, 'IRT')}</span>
                            <span>{formatCurrency(loan.amount, 'IRT')}</span>
                        </div>
                        <Progress value={100 - (loan.remainingAmount / loan.amount) * 100} className="h-2" />
                         <div className="flex justify-between text-xs text-muted-foreground text-center">
                            <span>{`${loan.numberOfInstallments - loan.paidInstallments} قسط باقی‌مانده`}</span>
                            <span>{`${loan.paidInstallments} از ${loan.numberOfInstallments} قسط پرداخت شده`}</span>
                        </div>
                    </div>
                </CardContent>
                {!isCompleted && (
                     <CardFooter>
                        <Button className="w-full" onClick={() => onPay(loan)}>
                            <CalendarCheck2 className="ml-2 h-4 w-4" />
                            پرداخت قسط
                        </Button>
                    </CardFooter>
                )}
            </Card>
        )})}
    </div>
  );
}
