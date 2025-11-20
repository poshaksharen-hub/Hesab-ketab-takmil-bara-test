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
} from 'lucide-react';
import type { Expense, BankAccount, Category, UserProfile, OwnerId } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ExpenseListProps {
  expenses: Expense[];
  bankAccounts: BankAccount[];
  categories: Category[];
  users: UserProfile[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
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
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-5 w-5 text-muted-foreground" />
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
  users,
}: ExpenseListProps) {
  const getBankAccount = (id: string) => {
    return bankAccounts.find((acc) => acc.id === id);
  };
  const getCategoryName = (id: string) => categories.find(cat => cat.id === id)?.name || 'نامشخص';
  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.firstName : 'نامشخص';
  };
  const getExpenseForText = (expenseFor?: 'ali' | 'fatemeh' | 'shared') => {
    if (!expenseFor) return 'نامشخص';
    switch (expenseFor) {
        case 'ali': return USER_DETAILS.ali.firstName;
        case 'fatemeh': return USER_DETAILS.fatemeh.firstName;
        case 'shared': return 'مشترک';
    }
  }

  if (expenses.length === 0) {
    return (
      <Card>
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
    <div className="space-y-4">
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

                return (
                <Card key={expense.id} className="flex flex-col">
                    <CardHeader>
                    <div className="flex items-start justify-between">
                        <p className="text-lg font-bold">{expense.description}</p>
                        <div className="text-left">
                        <p className="text-2xl font-bold text-destructive">
                            {`-${formatCurrency(expense.amount, 'IRT')}`}
                        </p>
                         {bankAccount?.ownerId === 'shared' && (
                            <Badge variant="secondary">مشترک</Badge>
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
                                value={bankAccount?.bankName || 'نامشخص'}
                            />
                            <DetailItem
                                icon={FolderKanban}
                                label="دسته‌بندی"
                                value={getCategoryName(expense.categoryId)}
                            />
                             <DetailItem
                                icon={Calendar}
                                label="تاریخ ثبت"
                                value={formatJalaliDate(new Date(expense.date))}
                            />
                            <DetailItem
                                icon={PenSquare}
                                label="ثبت توسط"
                                value={getUserName(expense.registeredByUserId)}
                            />
                        </div>
                    </CardContent>
                </Card>
                );
            })}
        </div>
    </div>
  );
}
