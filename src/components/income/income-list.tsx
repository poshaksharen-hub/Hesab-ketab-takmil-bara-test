
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
import { Button } from '@/components/ui/button';
import {
  Edit,
  Trash2,
  User,
  Users,
  Briefcase,
  Landmark,
  Calendar,
  PenSquare,
  Building,
} from 'lucide-react';
import type { Income, BankAccount, UserProfile, OwnerId } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
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
} from '@/components/ui/alert-dialog';
import { USER_DETAILS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface IncomeListProps {
  incomes: Income[];
  bankAccounts: BankAccount[];
  users: UserProfile[];
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
}

const DetailItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
    </div>
  );
};


export function IncomeList({
  incomes,
  bankAccounts,
  users,
  onEdit,
  onDelete,
}: IncomeListProps) {
  const getBankAccount = (id: string) => {
    return bankAccounts.find((acc) => acc.id === id);
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.firstName : 'نامشخص';
  };
  
  const getOwnerSourceText = (ownerId: OwnerId) => {
    switch (ownerId) {
      case 'ali':
        return `درآمد ${USER_DETAILS.ali.firstName}`;
      case 'fatemeh':
        return `درآمد ${USER_DETAILS.fatemeh.firstName}`;
      case 'shared':
        return 'شغل مشترک';
      default:
        return 'نامشخص';
    }
  }


  if (incomes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">لیست درآمدها</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">
            هیچ درآمدی برای نمایش وجود ندارد.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">لیست درآمدها</CardTitle>
          <CardDescription>
            درآمدهای ثبت شده اخیر شما در اینجا نمایش داده می‌شود.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {incomes
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          .map((income) => {
            const bankAccount = getBankAccount(income.bankAccountId);

            return (
              <Card key={income.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <p className="text-lg font-bold">{income.description}</p>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-emerald-500">
                        {formatCurrency(income.amount, 'IRT')}
                      </p>
                      {income.ownerId === 'shared' && (
                        <Badge variant="secondary">مشترک</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <Separator />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <DetailItem
                      icon={Briefcase}
                      label="منبع درآمد"
                      value={getOwnerSourceText(income.ownerId)}
                    />
                     <DetailItem
                      icon={Building}
                      label="واریز کننده"
                      value={income.source}
                    />
                    <DetailItem
                      icon={Landmark}
                      label="واریز به"
                      value={bankAccount?.bankName || 'نامشخص'}
                    />
                    <DetailItem
                      icon={Calendar}
                      label="تاریخ ثبت"
                      value={formatJalaliDate(new Date(income.date))}
                    />
                    <DetailItem
                      icon={PenSquare}
                      label="ثبت توسط"
                      value={getUserName(income.registeredByUserId)}
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
