
'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Landmark,
  Calendar,
  PenSquare,
  Users,
  User,
  FolderKanban,
  Wallet,
  Trash2,
  Receipt,
  BookUser,
} from 'lucide-react';
import type { Expense, BankAccount, Category, UserProfile, ExpenseFor, OwnerId, Payee } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';


interface ExpenseListProps {
  expenses: Expense[];
  bankAccounts: BankAccount[];
  categories: Category[];
  payees: Payee[];
  onDelete: (expenseId: string) => void;
  users: UserProfile[];
}

const DetailItem = ({
    icon: Icon,
    label,
    value,
    className,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | null | undefined;
    className?: string;
  }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 text-sm">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex flex-col">
          <span className="text-muted-foreground">{label}</span>
          <span className={`font-semibold ${className}`}>{value}</span>
        </div>
      </div>
    );
  };

export function ExpenseList({
  expenses,
  bankAccounts,
  categories,
  payees,
  onDelete,
  users,
}: ExpenseListProps) {
  const getBankAccount = (id: string) => {
    return bankAccounts.find((acc) => acc.id === id);
  };
  const getCategoryName = (id: string) => categories.find(cat => cat.id === id)?.name || 'نامشخص';
  
   const getPayeeName = (payeeId?: string) => {
    if (!payeeId) return null;
    return payees.find(p => p.id === payeeId)?.name || null;
  }
  const getExpenseForText = (expenseFor?: ExpenseFor) => {
    if (!expenseFor) return 'نامشخص';
    switch (expenseFor) {
        case 'ali': return USER_DETAILS.ali.firstName;
        case 'fatemeh': return USER_DETAILS.fatemeh.firstName;
        case 'shared': return 'مشترک';
    }
  }
   const getAccountOwnerName = (account?: BankAccount) => {
    if (!account) return '';
    if (account.ownerId === 'shared_account') return ' (مشترک)';
    const userDetail = USER_DETAILS[account.ownerId as 'ali' | 'fatemeh'];
    if (!userDetail) return ''; // Add a guard for safety
    return ` (${userDetail.firstName})`;
  };

  const getRegisteredByName = (userId?: string) => {
      if (!userId) return "نامشخص";
      return users.find(u => u.id === userId)?.firstName || "نامشخص";
  }


  if (expenses.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="font-headline">لیست هزینه‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">
            هیچ هزینه‌ای برای نمایش وجود ندارد.
          </p>
        </CardContent>
      </Card>
    );
  }
  


  return (
    <div className="space-y-4 mt-4">
        <Card>
            <CardHeader>
            <CardTitle className="font-headline">لیست هزینه‌ها</CardTitle>
            <CardDescription>
                هزینه‌های ثبت شده اخیر شما در اینجا نمایش داده می‌شود.
            </CardDescription>
            </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {expenses
            .sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .map((expense) => {
                const bankAccount = getBankAccount(expense.bankAccountId);
                const registeredByName = getRegisteredByName(expense.registeredByUserId);

                return (
                <Card key={expense.id} data-testid={`expense-item-${expense.id}`} className="flex flex-col">
                    <CardHeader>
                    <div className="flex items-start justify-between">
                        <p className="text-lg font-bold whitespace-pre-wrap">{expense.description}</p>
                        <div className="text-left shrink-0 pl-2">
                        <p className="text-2xl font-bold text-destructive">
                            {`-${formatCurrency(expense.amount, 'IRT')}`}
                        </p>
                         {bankAccount?.ownerId === 'shared_account' && expense.expenseFor !== 'shared' && (
                            <Badge variant="secondary">{`برای ${getExpenseForText(expense.expenseFor)}`}</Badge>
                        )}
                        </div>
                    </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                        <Separator />
                        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                            <DetailItem
                                icon={expense.expenseFor === 'shared' ? Users : User}
                                label="هزینه برای"
                                value={getExpenseForText(expense.expenseFor)}
                            />
                            <DetailItem
                                icon={Landmark}
                                label="برداشت از"
                                value={bankAccount ? `${bankAccount.bankName}${getAccountOwnerName(bankAccount)}` : 'نامشخص'}
                            />
                            <DetailItem
                                icon={FolderKanban}
                                label="دسته‌بندی"
                                value={getCategoryName(expense.categoryId)}
                            />
                             <DetailItem
                                icon={BookUser}
                                label="طرف حساب"
                                value={getPayeeName(expense.payeeId)}
                             />
                             <DetailItem
                                icon={Calendar}
                                label="تاریخ ثبت"
                                value={formatJalaliDate(new Date(expense.date))}
                            />
                            <DetailItem
                                icon={PenSquare}
                                label="ثبت توسط"
                                value={registeredByName}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="p-2 bg-muted/50">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" className="w-full text-xs text-destructive" aria-label="حذف هزینه">
                                    <Trash2 className="ml-2 h-4 w-4" />
                                    حذف تراکنش
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>آیا از حذف این هزینه مطمئن هستید؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    این عمل قابل بازگشت نیست. با حذف این هزینه، مبلغ آن به موجودی حساب شما بازگردانده خواهد شد.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(expense.id)}>
                                    بله، حذف کن
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
                );
            })}
        </div>
    </div>
  );
}
