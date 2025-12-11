
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Transfer, BankAccount, UserProfile } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowRight, Banknote, Trash2, PenSquare } from 'lucide-react';
import { USER_DETAILS } from '@/lib/constants';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';


interface TransferListProps {
  transfers: Transfer[];
  bankAccounts: BankAccount[];
  onDelete: (transferId: string) => void;
}

const BalanceChange = ({ label, amount, type }: { label: string, amount: number, type: 'before' | 'after' }) => (
  <div className="text-xs">
    <span className="text-muted-foreground">{label}: </span>
    <span className="font-mono font-semibold">{formatCurrency(amount, 'IRT').replace(' تومان', '')}</span>
  </div>
);


export function TransferList({ transfers, bankAccounts, onDelete }: TransferListProps) {
  
  const getAccountDisplayName = (id: string) => {
    const account = bankAccounts.find(acc => acc.id === id);
    if (!account) return { name: 'نامشخص', owner: '' };
    const ownerName = account.ownerId === 'shared_account' ? '(مشترک)' : `(${USER_DETAILS[account.ownerId as 'ali' | 'fatemeh']?.firstName || 'ناشناس'})`;
    return { name: account.bankName, owner: ownerName };
  };

  const getUserName = (userId: string) => {
    if (!userId) return 'نامشخص';
    if (userId === USER_DETAILS.ali.id) return USER_DETAILS.ali.firstName;
    if (userId === USER_DETAILS.fatemeh.id) return USER_DETAILS.fatemeh.firstName;
    return 'نامشخص';
  };
  
  if (transfers.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">تاریخچه انتقال‌ها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ انتقالی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">تاریخچه انتقال‌ها</CardTitle>
            <CardDescription>انتقال‌های اخیر شما در اینجا نمایش داده می‌شود.</CardDescription>
        </CardHeader>
      </Card>
      
      {transfers.sort((a,b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime()).map((transfer) => {
        const fromAccount = getAccountDisplayName(transfer.fromBankAccountId);
        const toAccount = getAccountDisplayName(transfer.toBankAccountId);

        return (
            <Card key={transfer.id}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <Banknote className="w-5 h-5 text-muted-foreground" />
                           <p className="font-bold text-lg">{formatCurrency(transfer.amount, 'IRT')}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatJalaliDate(new Date(transfer.transferDate))}</span>
                    </div>
                     {transfer.description && <p className="text-sm text-muted-foreground pt-2">{transfer.description}</p>}
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* From Account */}
                    <div className="flex flex-col gap-3 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                                <ArrowUp className="h-4 w-4 text-red-500" />
                            </div>
                            <div>
                               <p className="font-semibold text-sm">از حساب</p>
                               <p className="text-xs text-muted-foreground">{fromAccount.name} {fromAccount.owner}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <BalanceChange label="موجودی قبل" amount={transfer.fromAccountBalanceBefore} type="before" />
                            <div className="text-xs flex items-center gap-1 text-red-600">
                                <span className="font-mono font-semibold">-{formatCurrency(transfer.amount, 'IRT').replace(' تومان', '')}</span>
                            </div>
                            <BalanceChange label="موجودی بعد" amount={transfer.fromAccountBalanceAfter} type="after" />
                        </div>
                    </div>
                    {/* To Account */}
                     <div className="flex flex-col gap-3 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                                <ArrowDown className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div>
                               <p className="font-semibold text-sm">به حساب</p>
                               <p className="text-xs text-muted-foreground">{toAccount.name} {toAccount.owner}</p>
                            </div>
                        </div>
                        <Separator />
                         <div className="space-y-2">
                            <BalanceChange label="موجودی قبل" amount={transfer.toAccountBalanceBefore} type="before" />
                            <div className="text-xs flex items-center gap-1 text-emerald-600">
                                <span className="font-mono font-semibold">+{formatCurrency(transfer.amount, 'IRT').replace(' تومان', '')}</span>
                            </div>
                            <BalanceChange label="موجودی بعد" amount={transfer.toAccountBalanceAfter} type="after" />
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="p-2 bg-muted/50 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground" title={`ثبت توسط: ${getUserName(transfer.registeredByUserId)}`}>
                        <PenSquare className="h-3 w-3" />
                        <span>{getUserName(transfer.registeredByUserId)}</span>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" className="h-8 text-xs text-destructive" aria-label="حذف انتقال">
                                <Trash2 className="ml-2 h-4 w-4" />
                                حذف تراکنش
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>آیا از حذف این انتقال مطمئن هستید؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                این عمل قابل بازگشت نیست. با حذف این انتقال، مبلغ آن از حساب مقصد کسر و به حساب مبدا بازگردانده خواهد شد.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(transfer.id)}>
                                بله، حذف کن
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        )
    })}
    </div>
  );
}
