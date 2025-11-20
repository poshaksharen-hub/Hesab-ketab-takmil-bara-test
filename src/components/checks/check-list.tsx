
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ShieldCheck } from 'lucide-react';
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
import { Separator } from '../ui/separator';
import { USER_DETAILS } from '@/lib/constants';
import { numberToWords } from '@persian-tools/persian-tools';

interface CheckListProps {
  checks: Check[];
  bankAccounts: BankAccount[];
  payees: Payee[];
  categories: Category[];
  users: UserProfile[];
  onClear: (check: Check) => void;
}

export function CheckList({ checks, bankAccounts, payees, categories, onClear, users }: CheckListProps) {
  
  const getDetails = (item: Check) => {
    const payee = payees.find(p => p.id === item.payeeId)?.name || 'نامشخص';
    const category = categories.find(c => c.id === item.categoryId)?.name || 'نامشخص';
    const bankAccount = bankAccounts.find(b => b.id === item.bankAccountId);
    const ownerId = bankAccount?.ownerId;
    const ownerName = ownerId === 'shared' ? 'حساب مشترک' : (ownerId ? `${USER_DETAILS[ownerId].firstName} ${USER_DETAILS[ownerId].lastName}` : 'ناشناس');

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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {checks.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).map((check) => {
          const { payee, category, bankAccount, ownerName } = getDetails(check);
          const isCleared = check.status === 'cleared';

          return (
          <Card key={check.id} className={cn("overflow-hidden shadow-lg relative bg-slate-50/50 dark:bg-slate-900/50", isCleared && "opacity-70")}>
            {isCleared && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform rotate-[-15deg] border-4 border-emerald-500 text-emerald-500 rounded-lg p-2 text-3xl font-black uppercase opacity-50 select-none">
                    پاس شد
                </div>
            )}

            <CardContent className="p-4 space-y-3">
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

                {/* Amount in words */}
                <div className="text-center bg-muted/50 p-2 rounded-md">
                    <p className="font-semibold">{numberToWords(check.amount)} تومان</p>
                </div>
                
                 {/* Details Section */}
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">به نام</p>
                            <p className="font-semibold">{payee}</p>
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-muted-foreground">دسته‌بندی</p>
                            <p className="font-semibold">{category}</p>
                        </div>
                    </div>

                    {check.description && (
                         <div>
                            <p className="text-xs text-muted-foreground">شرح</p>
                            <p className="font-semibold text-sm">{check.description}</p>
                        </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">تاریخ صدور</p>
                            <p className="font-mono font-semibold">{formatJalaliDate(new Date(check.issueDate))}</p>
                        </div>
                         <div className="text-left">
                            <p className="text-xs text-muted-foreground">تاریخ سررسید</p>
                            <p className="font-mono font-semibold">{formatJalaliDate(new Date(check.dueDate))}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                        <div>
                            <p className="text-xs text-muted-foreground">شماره صیادی</p>
                            <p className="font-semibold tracking-wider">{check.sayadId}</p>
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-muted-foreground">شماره سری</p>
                            <p className="font-semibold tracking-wider">{check.checkSerialNumber}</p>
                        </div>
                    </div>
                </div>
            </CardContent>

            {!isCleared && (
                <CardFooter className="bg-muted/50 p-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button className="w-full" variant="ghost">
                                <ShieldCheck className="ml-2 h-5 w-5 text-emerald-500" />
                                پاس کردن چک
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>آیا از پاس کردن این چک مطمئن هستید؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                مبلغ چک از حساب شما کسر و یک هزینه متناظر با تمام جزئیات ثبت خواهد شد. این عملیات غیرقابل بازگشت است.
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
            )}
          </Card>
          )
        })}
      </div>
  );
}
