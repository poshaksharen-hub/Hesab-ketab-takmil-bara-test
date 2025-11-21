
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Handshake, ArrowLeft, CheckCircle, User, Users, Trash2 } from 'lucide-react';
import type { PreviousDebt, Payee, OwnerId } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { USER_DETAILS } from '@/lib/constants';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';


interface DebtListProps {
  debts: PreviousDebt[];
  payees: Payee[];
  onPay: (debt: PreviousDebt) => void;
  onDelete: (debtId: string) => void;
}

export function DebtList({ debts, payees, onPay, onDelete }: DebtListProps) {
  
  const getPayeeName = (payeeId?: string) => {
    if (!payeeId) return 'نامشخص';
    return payees.find(p => p.id === payeeId)?.name || 'نامشخص';
  };

  if (debts.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">لیست بدهی‌ها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ بدهی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  const getOwnerDetails = (ownerId: OwnerId) => {
    if (ownerId === 'shared') return { name: "مشترک", Icon: Users };
    const userDetail = USER_DETAILS[ownerId];
    if (!userDetail) return { name: "ناشناس", Icon: User };
    return { name: userDetail.firstName, Icon: User };
  };

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {debts.sort((a, b) => a.remainingAmount > 0 ? -1 : 1).map((debt) => {
            const progress = 100 - (debt.remainingAmount / debt.amount) * 100;
            const isCompleted = debt.remainingAmount <= 0;
            const { name: ownerName, Icon: OwnerIcon } = getOwnerDetails(debt.ownerId);

            return (
             <div key={debt.id} className="relative group">
              <Link href={`/debts/${debt.id}`} className="block cursor-pointer">
                <Card className={cn("flex flex-col justify-between shadow-lg h-full transition-shadow duration-300 group-hover:shadow-xl", isCompleted && "bg-muted/50")}>
                    <CardHeader>
                        <div className='flex justify-between items-start'>
                            <div className="space-y-1">
                                <CardTitle className={cn("flex items-center gap-2", isCompleted && "text-muted-foreground line-through")}>
                                     <OwnerIcon className="h-5 w-5 text-muted-foreground" />
                                     <span>{debt.description}</span>
                                </CardTitle>
                                <CardDescription className='flex items-center gap-2'>
                                     {isCompleted ? <Badge className="bg-emerald-500 text-white">تسویه شده</Badge> : <Badge variant="destructive">در حال پرداخت</Badge>}
                                    <span className="text-xs">(به: {getPayeeName(debt.payeeId)})</span>
                                </CardDescription>
                            </div>
                           <div className="flex gap-1">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="inline-block">
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="حذف بدهی">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>آیا از حذف این بدهی مطمئن هستید؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                           این عمل قابل بازگشت نیست. بدهی و تمام سوابق پرداخت و هزینه‌های مرتبط با آن برای همیشه حذف خواهند شد و مبالغ به حساب‌ها بازگردانده می‌شوند.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                                        <AlertDialogAction onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(debt.id); }}>
                                            بله، حذف کن
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                           </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{formatCurrency(debt.remainingAmount, 'IRT')}</span>
                                <span>{formatCurrency(debt.amount, 'IRT')}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground text-center">
                                <span>{`${Math.round(progress)}٪ پرداخت شده`}</span>
                            </div>
                        </div>
                    </CardContent>
                     <CardFooter>
                        {isCompleted ? (
                            <div className="w-full flex items-center justify-center text-emerald-600 gap-2 font-bold">
                                <CheckCircle className="h-5 w-5" />
                                <span>بدهی تسویه شد!</span>
                            </div>
                        ) : (
                             <div onClick={(e) => {e.preventDefault(); e.stopPropagation(); onPay(debt);}} className="w-full">
                                <Button className="w-full">
                                    <Handshake className="ml-2 h-4 w-4" />
                                    پرداخت بدهی
                                </Button>
                            </div>
                        )}
                    </CardFooter>
                </Card>
              </Link>
             </div>
        )})}
    </div>
  );
}
