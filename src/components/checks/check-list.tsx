'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, MoreVertical, Edit, CheckCircle, Loader2, Camera, FileText } from 'lucide-react';
import type { Check, BankAccount, Payee, Category, UserProfile } from '@/lib/types';
import { formatCurrency, formatJalaliDate, cn, amountToWords, getPublicUrl } from '@/lib/utils';
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
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';
import { HesabKetabLogo } from '../icons';
import Image from 'next/image';
import { ClearCheckDialog } from './clear-check-dialog';

interface CheckListProps {
  checks: Check[];
  bankAccounts: BankAccount[];
  payees: Payee[];
  categories: Category[];
  onClear: (data: { check: Check; receiptPath?: string }) => void;
  onDelete: (check: Check) => void;
  onEdit: (check: Check) => void;
  users: UserProfile[];
  isSubmitting: boolean;
}

const getDetails = (item: Check, payees: Payee[], categories: Category[], bankAccounts: BankAccount[], users: UserProfile[]) => {
    const payee = payees.find(p => p.id === item.payeeId)?.name || 'نامشخص';
    const category = categories.find(c => c.id === item.categoryId)?.name || 'نامشخص';
    const bankAccount = bankAccounts.find(b => b.id === item.bankAccountId);
    const ownerId = bankAccount?.ownerId;
    const signatureImage = item.signatureDataUrl || (ownerId ? (USER_DETAILS[ownerId as 'ali' | 'fatemeh']?.signatureImage) : undefined);
    const ownerName = ownerId === 'shared_account' ? 'علی و فاطمه' : (ownerId && USER_DETAILS[ownerId as 'ali' | 'fatemeh'] ? `${USER_DETAILS[ownerId as 'ali' | 'fatemeh'].firstName} ${USER_DETAILS[ownerId as 'ali' | 'fatemeh'].lastName}` : 'ناشناس');
    const expenseForName = item.expenseFor && USER_DETAILS[item.expenseFor] ? USER_DETAILS[item.expenseFor].firstName : 'مشترک';
    const registeredByName = users.find(u => u.id === item.registeredByUserId)?.firstName || 'سیستم';
    return { payee, category, bankAccount, ownerId, ownerName, expenseForName, signatureImage, registeredByName };
};

const CheckCard = ({ check, bankAccounts, payees, categories, onClear, onDelete, onEdit, users, isSubmitting }: {
    check: Check;
    bankAccounts: BankAccount[];
    payees: Payee[];
    categories: Category[];
    onClear: (data: { check: Check; receiptPath?: string }) => void;
    onDelete: (check: Check) => void;
    onEdit: (check: Check) => void;
    users: UserProfile[];
    isSubmitting: boolean;
}) => {

    const { payee, bankAccount, ownerName, expenseForName, category, signatureImage, registeredByName } = getDetails(check, payees, categories, bankAccounts, users);
    const isCleared = check.status === 'cleared';
    const isDeleteDisabled = isCleared || isSubmitting;
    const imageUrl = check.image_path ? getPublicUrl(check.image_path) : null;
    const clearanceReceiptUrl = check.clearance_receipt_path ? getPublicUrl(check.clearance_receipt_path) : null;

    return (
        <div className="relative group" data-testid={`check-item-${check.id}`}>
            <div className={cn("overflow-hidden shadow-lg h-full flex flex-col group-hover:shadow-xl transition-shadow bg-slate-50 dark:bg-slate-900 border-2 border-gray-300 dark:border-gray-700", isCleared && "opacity-60")}>
                {isCleared && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-12 border-4 border-emerald-500 text-emerald-500 rounded-lg p-2 text-4xl font-black uppercase opacity-60 select-none z-20">
                        پاس شد
                    </div>
                )}
                
                <div className="p-3 relative bg-gray-100 dark:bg-gray-800/50 flex justify-between items-start">
                     <div className="text-left w-1/3 space-y-1">
                        <p className="text-[10px] text-muted-foreground font-sans">شناسه صیاد: <span className="font-mono font-bold tracking-wider text-foreground">{check.sayadId}</span></p>
                     </div>
                    <div className="text-center w-1/3">
                        <HesabKetabLogo className="w-6 h-6 mx-auto text-primary/70" />
                        <p className="font-bold font-body text-sm">{bankAccount?.bankName}</p>
                    </div>
                    <div className="text-right w-1/3 flex flex-col items-end">
                         <p className="text-xs text-muted-foreground font-body">سررسید:</p>
                         <p className="font-handwriting font-bold text-lg">{formatJalaliDate(new Date(check.dueDate))}</p>
                    </div>
                     <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="absolute top-2 left-2 z-20">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Actions" disabled={isSubmitting}>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {!isCleared && (
                                     <ClearCheckDialog check={check} onClear={onClear} isSubmitting={isSubmitting}>
                                        <div className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "text-emerald-600 focus:text-emerald-700")}>
                                            <CheckCircle className="ml-2 h-4 w-4" /> پاس کردن چک
                                        </div>
                                    </ClearCheckDialog>
                                )}
                                <DropdownMenuItem onSelect={() => onEdit(check)} disabled={isCleared || isSubmitting}>
                                    <Edit className="ml-2 h-4 w-4" /> ویرایش چک
                                </DropdownMenuItem>
                                
                                {imageUrl && (
                                    <DropdownMenuItem onSelect={() => window.open(imageUrl, '_blank')}>
                                        <Camera className="ml-2 h-4 w-4" /> مشاهده عکس چک
                                    </DropdownMenuItem>
                                )}
                                
                                {clearanceReceiptUrl && (
                                    <DropdownMenuItem onSelect={() => window.open(clearanceReceiptUrl, '_blank')}>
                                        <FileText className="ml-2 h-4 w-4" /> مشاهده رسید پاس شدن
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <div className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", isDeleteDisabled ? "text-muted-foreground cursor-not-allowed" : "text-destructive focus:text-destructive")}>
                                            <Trash2 className="ml-2 h-4 w-4" /> حذف چک
                                        </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>آیا از حذف این چک مطمئن هستید؟</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(check)} disabled={isDeleteDisabled} className={buttonVariants({ variant: "destructive" })}>
                                                 {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : 'بله، حذف کن'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                
                 <Link href={`/checks/${check.id}`} className="block p-4 space-y-2 flex-grow flex flex-col text-sm">
                     <div className="flex items-baseline gap-2 border-b-2 border-dotted border-gray-400 pb-1 font-body">
                        <span className="shrink-0">در وجه:</span>
                         <span className="font-handwriting font-bold text-base">{payee}</span>
                     </div>
                     <div className="flex items-baseline gap-2 border-b-2 border-dotted border-gray-400 pb-1 font-body">
                         <span className="shrink-0">مبلغ:</span>
                         <span className="font-handwriting font-bold text-base text-center flex-grow px-1">
                            {amountToWords(check.amount)} تومان
                        </span>
                     </div>
                     <div className="flex-grow"></div>
                    <div className="flex justify-between items-end pt-4">
                        <div className="text-left">
                            <span className="text-xs text-muted-foreground font-body">مبلغ عددی</span>
                            <p className="font-handwriting font-bold text-xl">{formatCurrency(check.amount, 'IRT')}</p>
                        </div>
                        <div className="text-right relative">
                            <span className="text-xs text-muted-foreground font-body">صاحب حساب:</span>
                            <p className="font-body text-sm font-semibold h-6">{ownerName}</p>
                            {signatureImage && (
                                <div className="absolute -bottom-5 right-0 w-28 h-14 pointer-events-none">
                                    <Image 
                                        src={signatureImage}
                                        alt={`امضای ${ownerName}`} 
                                        width={112} 
                                        height={56}
                                        style={{ objectFit: 'contain'}}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export function CheckList({ checks, bankAccounts, payees, categories, onClear, onDelete, onEdit, users, isSubmitting }: CheckListProps) {
  
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
        {checks.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).map((check) => (
            <CheckCard 
                key={check.id}
                check={check}
                bankAccounts={bankAccounts}
                payees={payees}
                categories={categories}
                onClear={onClear}
                onDelete={onDelete}
                onEdit={onEdit}
                users={users}
                isSubmitting={isSubmitting}
            />
        ))}
      </div>
  );
}
