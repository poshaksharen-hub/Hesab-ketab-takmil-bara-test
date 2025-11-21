
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, CalendarCheck2, ArrowLeft, CheckCircle, Landmark, Edit, MoreVertical, History } from 'lucide-react';
import type { Loan, LoanPayment, Payee, BankAccount } from '@/lib/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { getNextDueDate } from '@/lib/date-utils';
import Link from 'next/link';
import { USER_DETAILS } from '@/lib/constants';


interface LoanListProps {
  loans: Loan[];
  payees: Payee[];
  bankAccounts: BankAccount[];
  onEdit: (loan: Loan) => void;
  onDelete: (loanId: string) => void;
  onPay: (loan: Loan) => void;
}

export function LoanList({ loans, payees, bankAccounts, onEdit, onDelete, onPay }: LoanListProps) {
  
  const getPayeeName = (payeeId?: string) => {
    if (!payeeId) return 'نامشخص';
    return payees.find(p => p.id === payeeId)?.name || 'نامشخص';
  };

  const getAccountInfo = (accountId?: string) => {
    if (!accountId) return null;
    const account = bankAccounts.find(acc => acc.id === accountId);
    if (!account) return null;
    const ownerName = account.ownerId === 'shared' ? 'حساب مشترک' : USER_DETAILS[account.ownerId]?.firstName || '';
    return { bankName: account.bankName, ownerName };
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
    if (loan.remainingAmount <= 0) {
      return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">تسویه شده</Badge>;
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
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {loans.sort((a, b) => a.paidInstallments - b.paidInstallments).map((loan) => {
            const progress = 100 - (loan.remainingAmount / loan.amount) * 100;
            const isCompleted = loan.remainingAmount <= 0;
            const depositAccountInfo = getAccountInfo(loan.depositToAccountId);

            return (
             <div key={loan.id} className="relative group">
                <Card className={cn("flex flex-col justify-between shadow-lg h-full transition-shadow duration-300 group-hover:shadow-xl", isCompleted && "bg-muted/50")}>
                    <CardHeader>
                        <div className='flex justify-between items-start'>
                            <div className="space-y-1">
                                <CardTitle className={cn("font-headline", isCompleted && "text-muted-foreground line-through")}>{loan.title}</CardTitle>
                                <CardDescription className='flex items-center gap-2'>
                                    {getLoanStatus(loan)}
                                    {loan.payeeId && <span className="text-xs">(از: {getPayeeName(loan.payeeId)})</span>}
                                </CardDescription>
                                {depositAccountInfo && (
                                     <CardDescription className="flex items-center gap-2 text-xs text-primary pt-1">
                                        <Landmark className="h-3 w-3" />
                                        <span>واریز شده به: {depositAccountInfo.bankName} ({depositAccountInfo.ownerName})</span>
                                     </CardDescription>
                                )}
                            </div>
                           <div className="flex gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                           <Link href={`/loans/${loan.id}`}>
                                            <History className="ml-2 h-4 w-4" />
                                            مشاهده تاریخچه
                                           </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => onEdit(loan)} disabled>
                                            <Edit className="ml-2 h-4 w-4" />
                                            ویرایش وام
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={() => onDelete(loan.id)}
                                            className="text-destructive focus:text-destructive"
                                            disabled={!isCompleted}
                                        >
                                            <Trash2 className="ml-2 h-4 w-4" />
                                            حذف وام
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                           </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{formatCurrency(loan.remainingAmount, 'IRT')}</span>
                                <span>{formatCurrency(loan.amount, 'IRT')}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground text-center">
                                <span>{`${loan.numberOfInstallments - loan.paidInstallments} قسط باقی‌مانده`}</span>
                                <span>{`${loan.paidInstallments} از ${loan.numberOfInstallments} قسط پرداخت شده`}</span>
                            </div>
                        </div>
                    </CardContent>
                     <CardFooter className="grid grid-cols-2 gap-2">
                        {isCompleted ? (
                            <div className="col-span-2 w-full flex items-center justify-center text-emerald-600 gap-2 font-bold">
                                <CheckCircle className="h-5 w-5" />
                                <span>وام تسویه شد!</span>
                            </div>
                        ) : (
                            <Button className="w-full col-span-2" onClick={(e) => {e.preventDefault(); e.stopPropagation(); onPay(loan);}}>
                                <CalendarCheck2 className="ml-2 h-4 w-4" />
                                پرداخت قسط
                            </Button>
                        )}
                    </CardFooter>
                </Card>
             </div>
        )})}
    </div>
  );
}
