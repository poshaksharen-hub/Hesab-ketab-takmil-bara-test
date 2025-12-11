
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Handshake, ArrowLeft, CheckCircle, User, Users, Trash2, MoreVertical, History, PenSquare } from 'lucide-react';
import type { PreviousDebt, Payee, OwnerId, UserProfile } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { USER_DETAILS } from '@/lib/constants';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';


interface DebtListProps {
  debts: PreviousDebt[];
  payees: Payee[];
  users: UserProfile[];
  onPay: (debt: PreviousDebt) => void;
  onDelete: (debtId: string) => void;
}

export function DebtList({ debts, payees, users, onPay, onDelete }: DebtListProps) {
  
  const getPayeeName = (payeeId?: string) => {
    if (!payeeId) return 'نامشخص';
    return payees.find(p => p.id === payeeId)?.name || 'نامشخص';
  };

  const getUserName = (userId: string) => {
    if (!userId) return 'نامشخص';
    const user = users.find(u => u.id === userId);
    return user ? user.firstName : 'نامشخص';
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
    const userDetail = USER_DETAILS[ownerId as 'ali' | 'fatemeh'];
    if (!userDetail) return { name: "ناشناس", Icon: User };
    return { name: userDetail.firstName, Icon: User };
  };

  return (
    <div className='grid grid-cols-1 gap-6'>
        {debts.sort((a, b) => (a.remainingAmount > 0 ? -1 : 1) - (b.remainingAmount > 0 ? -1 : 1) || new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((debt) => {
            const progress = 100 - (debt.remainingAmount / debt.amount) * 100;
            const isCompleted = debt.remainingAmount <= 0;
            const { name: ownerName, Icon: OwnerIcon } = getOwnerDetails(debt.ownerId);

            return (
             <div key={debt.id} className="relative group">
                <Link href={`/debts/${debt.id}`} className="block h-full cursor-pointer" aria-label={`View details for debt: ${debt.description}`}>
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
                            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); const router = (e.target as HTMLElement).closest('a')?.href; if (router) window.location.href = router; }}>
                                            <History className="ml-2 h-4 w-4" />
                                            مشاهده تاریخچه
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <div className={cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "text-destructive focus:text-destructive")}>
                                                    <Trash2 className="ml-2 h-4 w-4" />
                                                    حذف بدهی
                                                </div>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>آیا از حذف این بدهی مطمئن هستید؟</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    این عمل قابل بازگشت نیست. اگر بدهی دارای سابقه پرداخت باشد، امکان حذف آن وجود ندارد. در غیر این صورت، بدهی برای همیشه حذف خواهد شد.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive hover:bg-destructive/90"
                                                    disabled={debt.remainingAmount > 0 && debt.remainingAmount < debt.amount}
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(debt.id); }}>
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
                                    <span>{formatCurrency(debt.remainingAmount, 'IRT')}</span>
                                    <span>{formatCurrency(debt.amount, 'IRT')}</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                                <div className="flex justify-between items-center text-xs text-muted-foreground text-center">
                                    <span>{`${Math.round(progress)}٪ پرداخت شده`}</span>
                                    <div className="flex items-center gap-1" title={`ثبت توسط: ${getUserName(debt.registeredByUserId)}`}>
                                    <PenSquare className="h-3 w-3" />
                                    <span>{getUserName(debt.registeredByUserId)}</span>
                                    </div>
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
