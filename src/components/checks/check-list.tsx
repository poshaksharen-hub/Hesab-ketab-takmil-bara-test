

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ShieldCheck, Trash2, ArrowLeft, MoreVertical, History } from 'lucide-react';
import type { Check, BankAccount, Payee, Category, UserProfile } from '@/lib/types';
import { formatCurrency, formatJalaliDate, cn } from '@/lib/utils';
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
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Separator } from '../ui/separator';
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';

interface CheckListProps {
  checks: Check[];
  bankAccounts: BankAccount[];
  payees: Payee[];
  categories: Category[];
  users?: UserProfile[];
  onClear: (check: Check) => void;
  onDelete: (check: Check) => void;
}

export function CheckList({ checks, bankAccounts, payees, categories, onClear, onDelete, users = [] }: CheckListProps) {
  
  const getDetails = (item: Check) => {
    const payee = payees.find(p => p.id === item.payeeId)?.name || 'نامشخص';
    const category = categories.find(c => c.id === item.categoryId)?.name || 'نامشخص';
    const bankAccount = bankAccounts.find(b => b.id === item.bankAccountId);
    const ownerId = bankAccount?.ownerId;
    const ownerName = ownerId === 'shared' ? 'حساب مشترک' : (ownerId && USER_DETAILS[ownerId] ? `${USER_DETAILS[ownerId].firstName}` : 'ناشناس');

    return { payee, category, bankAccount, ownerName };
  }
  
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {checks.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).map((check) => {
          const { payee, category, bankAccount, ownerName } = getDetails(check);
          const isCleared = check.status === 'cleared';

          return (
          <div key={check.id} className="relative group">
            <Link href={`/checks/${check.id}`} className="block h-full">
                <Card  className={cn("overflow-hidden shadow-lg relative bg-slate-50/50 dark:bg-slate-900/50 h-full flex flex-col group-hover:shadow-xl transition-shadow", isCleared && "opacity-70")}>
                    {isCleared && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform rotate-[-15deg] border-4 border-emerald-500 text-emerald-500 rounded-lg p-2 text-3xl font-black uppercase opacity-50 select-none">
                            پاس شد
                        </div>
                    )}
                     <div onClick={(e) => {e.preventDefault(); e.stopPropagation();}} className="absolute top-2 left-2 z-20">
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                     <DropdownMenuItem asChild>
                                        <Link href={`/checks/${check.id}`}>
                                            <History className="ml-2 h-4 w-4" />
                                            مشاهده جزئیات
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                           <div className={cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "text-destructive focus:text-destructive")}>
                                                <Trash2 className="ml-2 h-4 w-4" />
                                                حذف چک
                                            </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>آیا از حذف این چک مطمئن هستید؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                این عمل قابل بازگشت نیست. اگر چک پاس شده باشد، هزینه مربوط به آن نیز حذف و مبلغ به حساب شما بازگردانده می‌شود. در غیر اینصورت فقط خود چک حذف می‌شود.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => onDelete(check)}>
                                                بله، حذف کن
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                       </div>
                    <CardContent className="p-4 space-y-3 flex-grow">
                        {/* Header Section */}
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground">مبلغ</p>
                                <p className="text-2xl font-bold font-mono">{formatCurrency(check.amount, 'IRT')}</p>
                            </div>
                            <div className="text-left">
                                <p className="text-sm text-muted-foreground">بانک: {bankAccount?.bankName}</p>
                                <p className="text-xs">{ownerName}</p>
                            </div>
                        </div>
                        
                        {/* Details Section */}
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">به نام</p>
                                    <p className="font-semibold">{payee}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-muted-foreground">دسته‌بندی</p>
                                    <p className="font-semibold">{category}</p>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">تاریخ صدور</p>
                                    <p className="font-semibold font-mono">{formatJalaliDate(new Date(check.issueDate))}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-muted-foreground">تاریخ سررسید</p>
                                    <p className="font-semibold font-mono">{formatJalaliDate(new Date(check.dueDate))}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-muted/50 p-2 grid grid-cols-1 gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button className="w-full" variant="ghost" disabled={isCleared} title="پاس کردن چک" onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
                                    <ShieldCheck className="ml-2 h-5 w-5 text-emerald-500" />
                                    پاس کردن چک
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>آیا از پاس کردن این چک مطمئن هستید؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    مبلغ چک از حساب شما کسر و یک هزینه متناظر با تمام جزئیات ثبت خواهد شد.
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
                    </CardFooter>
                </Card>
            </Link>
          </div>
          )
        })}
      </div>
  );
}
