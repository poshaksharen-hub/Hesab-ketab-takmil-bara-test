
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, MoreVertical, History, Edit, Users, User } from 'lucide-react';
import type { Check, BankAccount, Payee, Category, UserProfile } from '@/lib/types';
import { formatCurrency, formatJalaliDate, cn, amountToWords } from '@/lib/utils';
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
import { SignatureAli, SignatureFatemeh, HesabKetabLogo } from '../icons';

interface CheckListProps {
  checks: Check[];
  bankAccounts: BankAccount[];
  payees: Payee[];
  categories: Category[];
  users?: UserProfile[];
  onClear: (check: Check) => void;
  onDelete: (check: Check) => void;
  onEdit: (check: Check) => void;
}

const CheckCard = ({ check, bankAccounts, payees, categories, users = [], onClear, onDelete, onEdit }: {
    check: Check;
    bankAccounts: BankAccount[];
    payees: Payee[];
    categories: Category[];
    users?: UserProfile[];
    onClear: (check: Check) => void;
    onDelete: (check: Check) => void;
    onEdit: (check: Check) => void;
}) => {

    const getDetails = (item: Check) => {
        const payee = payees.find(p => p.id === item.payeeId)?.name || 'نامشخص';
        const category = categories.find(c => c.id === item.categoryId)?.name || 'نامشخص';
        const bankAccount = bankAccounts.find(b => b.id === item.bankAccountId);
        const ownerId = bankAccount?.ownerId;
        const ownerName = ownerId === 'shared_account' ? 'علی کاکایی و فاطمه صالح' : (ownerId && USER_DETAILS[ownerId as 'ali' | 'fatemeh'] ? `${USER_DETAILS[ownerId as 'ali' | 'fatemeh'].firstName} ${USER_DETAILS[ownerId as 'ali' | 'fatemeh'].lastName}` : 'ناشناس');
        const expenseForName = item.expenseFor && USER_DETAILS[item.expenseFor] ? USER_DETAILS[item.expenseFor].firstName : 'مشترک';
        return { payee, category, bankAccount, ownerId, ownerName, expenseForName };
    }

    const { payee, bankAccount, ownerId, ownerName, expenseForName, category } = getDetails(check);
    const isCleared = check.status === 'cleared';

    return (
        <div className="relative group">
            <Link href={`/checks/${check.id}`} className="block h-full cursor-pointer" aria-label={`View details for check to ${payee}`}>
                <Card className={cn("overflow-hidden shadow-lg h-full flex flex-col group-hover:shadow-xl transition-shadow bg-slate-50 dark:bg-slate-900 border-2 border-gray-300 dark:border-gray-700", isCleared && "opacity-60")}>
                    {isCleared && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform rotate-[-15deg] border-4 border-emerald-500 text-emerald-500 rounded-lg p-2 text-4xl font-black uppercase opacity-60 select-none z-20">
                            پاس شد
                        </div>
                    )}
                    
                    {/* Header */}
                    <div className="p-3 relative bg-gray-100 dark:bg-gray-800/50 flex justify-between items-start font-body">
                        {/* Left Side: IDs */}
                        <div className="text-left w-1/3 space-y-1">
                            <p className="text-[10px] text-muted-foreground">شناسه صیاد: <span className="font-mono font-bold tracking-wider text-foreground">{check.sayadId}</span></p>
                            <p className="text-[10px] text-muted-foreground">سریال چک: <span className="font-mono font-bold tracking-tight text-foreground">{check.checkSerialNumber}</span></p>
                        </div>

                        {/* Center: Bank Name */}
                        <div className="text-center w-1/3">
                            <HesabKetabLogo className="w-6 h-6 mx-auto text-primary/70" />
                            <p className="font-bold text-sm">{bankAccount?.bankName}</p>
                        </div>
                        
                        {/* Right Side: Date */}
                        <div className="text-right w-1/3 flex flex-col items-end">
                             <p className="text-xs text-muted-foreground font-body">تاریخ:</p>
                             <p className="font-handwriting font-bold text-lg">{formatJalaliDate(new Date(check.dueDate))}</p>
                        </div>
                        
                         <div onClick={(e) => {e.preventDefault(); e.stopPropagation();}} className="absolute top-2 left-2 z-20">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Actions">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onSelect={() => onEdit(check)} disabled={isCleared}>
                                        <Edit className="ml-2 h-4 w-4" />
                                        ویرایش چک
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
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-2 flex-grow flex flex-col text-sm font-body">
                         <div className="flex items-baseline gap-2 border-b-2 border-dotted border-gray-400 pb-1">
                            <span className="shrink-0">به موجب این چک مبلغ</span>
                            <span className="font-handwriting font-bold text-base text-center flex-grow px-1">
                                {amountToWords(check.amount)}
                            </span>
                            <span className="shrink-0">تومان</span>
                        </div>
                        <div className="flex items-baseline gap-2 border-b-2 border-dotted border-gray-400 pb-1">
                            <span className="shrink-0">در وجه:</span>
                            <span className="font-handwriting font-bold text-base">{payee}</span>
                            <span className="shrink-0 ml-4">برای:</span>
                            <span className="font-handwriting font-bold text-base flex-grow">
                               {expenseForName}
                            </span>
                        </div>
                        <div className="flex-grow"></div>
                        <div className="flex justify-between items-end pt-4">
                             <div className="text-left">
                                <span className="text-xs text-muted-foreground">مبلغ</span>
                                <p className="font-handwriting font-bold text-xl">{formatCurrency(check.amount, 'IRT')}</p>
                            </div>
                            <div className="text-center">
                                <span className="text-xs text-muted-foreground">دسته‌بندی</span>
                                <p className="font-handwriting font-bold text-base">{category}</p>
                            </div>
                             <div className="text-right relative">
                                <span className="text-xs text-muted-foreground">صاحب حساب:</span>
                                <p className="font-body text-sm font-semibold">{ownerName}</p>
                                <div className="absolute -bottom-5 -right-2 w-24 h-12 pointer-events-none opacity-80">
                                    {ownerId === 'ali' && <SignatureAli className="w-full h-full text-gray-700 dark:text-gray-300" />}
                                    {ownerId === 'fatemeh' && <SignatureFatemeh className="w-full h-full text-gray-700 dark:text-gray-300" />}
                                    {ownerId === 'shared_account' && (
                                        <>
                                            <SignatureAli className="w-20 h-10 absolute -top-2 right-4 text-gray-700 dark:text-gray-300" />
                                            <SignatureFatemeh className="w-20 h-10 absolute -top-2 left-[-20px] text-gray-700 dark:text-gray-300" />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </Link>
        </div>
    );
};

export function CheckList({ checks, bankAccounts, payees, categories, onClear, onDelete, onEdit, users = [] }: CheckListProps) {
  
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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {checks.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).map((check) => (
            <CheckCard 
                key={check.id}
                check={check}
                bankAccounts={bankAccounts}
                payees={payees}
                categories={categories}
                users={users}
                onClear={onClear}
                onDelete={onDelete}
                onEdit={onEdit}
            />
        ))}
      </div>
  );
}
