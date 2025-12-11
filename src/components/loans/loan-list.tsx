
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, CalendarCheck2, ArrowLeft, CheckCircle, Landmark, MoreVertical, History, Edit, PenSquare, User, Users } from 'lucide-react';
import type { Loan, LoanPayment, Payee, BankAccount, UserProfile, OwnerId } from '@/lib/types';
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
  users: UserProfile[];
  onDelete: (loanId: string) => void;
  onPay: (loan: Loan) => void;
  onEdit: (loan: Loan) => void;
}

export function LoanList({ loans, payees, bankAccounts, onDelete, onPay, onEdit, users }: LoanListProps) {
  
  const getPayeeName = (payeeId?: string) => {
    if (!payeeId) return 'نامشخص';
    return payees.find(p => p.id === payeeId)?.name || 'نامشخص';
  };

  const getAccountInfo = (accountId?: string) => {
    if (!accountId) return { bankName: 'نامشخص', ownerName: '' };
    const account = bankAccounts.find(acc => acc.id === accountId);
    if (!account) return { bankName: 'نامشخص', ownerName: '' };
    const ownerName = account.ownerId === 'shared_account' ? 'حساب مشترک' : (USER_DETAILS[account.ownerId as 'ali' | 'fatemeh']?.firstName || 'ناشناس');
    return { bankName: account.bankName, ownerName };
  };

  const getUserName = (userId: string) => {
    const userProfile = users.find(u => u.id === userId);
    return userProfile ? userProfile.firstName : 'نامشخص';
  };


  if (loans.length === 0) {
    return (
        <Card className="mt-4">
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
    const nextDueDate = getNextDueDate(loan);
    if (!nextDueDate) return <Badge variant="secondary">در حال پرداخت</Badge>;

    const today = new Date();
    today.setHours(0,0,0,0);
    if(nextDueDate < today) {
        return <Badge variant="destructive">قسط معوق</Badge>;
    }
    return <Badge variant="secondary">در حال پرداخت</Badge>;
  };

  const getOwnerDetails = (ownerId: OwnerId) => {
    if (ownerId === 'shared') return { name: "مشترک", Icon: Users };
    const userDetail = USER_DETAILS[ownerId as 'ali' | 'fatemeh'];
    if (!userDetail) return { name: "ناشناس", Icon: User };
    return { name: userDetail.firstName, Icon: User };
  };


  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-4'>
        {loans.sort((a, b) => (a.remainingAmount > 0 ? -1 : 1) - (b.remainingAmount > 0 ? -1 : 1) || new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((loan) => {
            const progress = 100 - (loan.remainingAmount / loan.amount) * 100;
            const isCompleted = loan.remainingAmount <= 0;
            const depositAccountInfo = getAccountInfo(loan.depositToAccountId);
            const { name: ownerName, Icon: OwnerIcon } = getOwnerDetails(loan.ownerId);

            return (
             <div key={loan.id} className="relative group">
                <Link href={`/loans/${loan.id}`} className="block h-full cursor-pointer" aria-label={`View details for loan ${loan.title}`}>
                    <Card className={cn("flex flex-col justify-between shadow-lg h-full transition-shadow duration-300 group-hover:shadow-xl", isCompleted && "bg-muted/50")}>
                        <CardHeader>
                            <div className='flex justify-between items-start'>
                                <div className="space-y-1">
                                    <CardTitle className={cn("font-headline flex items-center gap-2", isCompleted && "text-muted-foreground line-through")}>
                                      <OwnerIcon className="h-5 w-5 text-muted-foreground" />
                                      {loan.title}
                                    </CardTitle>
                                    <CardDescription className='flex items-center gap-2'>
                                        {getLoanStatus(loan)}
                                        {loan.payeeId && <span className="text-xs">(از: {getPayeeName(loan.payeeId)})</span>}
                                    </CardDescription>
                                    {depositAccountInfo.bankName !== 'نامشخص' && (
                                        <CardDescription className="flex items-center gap-2 text-xs text-primary pt-1">
                                            <Landmark className="h-3 w-3" />
                                            <span>واریز شده به: {depositAccountInfo.bankName} ({depositAccountInfo.ownerName})</span>
                                        </CardDescription>
                                    )}
                                </div>
                            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={(e) => {e.preventDefault(); const router = (e.target as HTMLElement).closest('a')?.href; if(router) window.location.href = router; }}>
                                            <History className="ml-2 h-4 w-4" />
                                            مشاهده تاریخچه
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => onEdit(loan)} disabled={isCompleted}>
                                            <Edit className="ml-2 h-4 w-4" />
                                            ویرایش وام
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <div className={cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "text-destructive focus:text-destructive")}>
                                                    <Trash2 className="ml-2 h-4 w-4" />
                                                    حذف وام
                                                </div>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>آیا از حذف این وام مطمئن هستید؟</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                این عمل قابل بازگشت نیست. اگر وام دارای سابقه پرداخت باشد، امکان حذف آن وجود ندارد. در غیر این صورت، تمام سوابق مالی مرتبط (مانند واریز اولیه) معکوس و وام حذف خواهد شد.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive hover:bg-destructive/90"
                                                    disabled={loan.paidInstallments > 0}
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(loan.id); }}>
                                                    بله، حذف کن
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
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
                                <div className="flex justify-between items-center text-xs text-muted-foreground text-center">
                                    <span>{`${loan.numberOfInstallments > 0 ? (loan.numberOfInstallments - loan.paidInstallments) + ' قسط باقی‌مانده' : 'پرداخت نشده'}`}</span>
                                    <div className="flex items-center gap-1" title={`ثبت توسط: ${getUserName(loan.registeredByUserId)}`}>
                                      <PenSquare className="h-3 w-3" />
                                      <span>{getUserName(loan.registeredByUserId)}</span>
                                    </div>
                                    <span>{`${loan.paidInstallments} از ${loan.numberOfInstallments || '؟'} قسط`}</span>
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
                </Link>
             </div>
        )})}
    </div>
  );
}
