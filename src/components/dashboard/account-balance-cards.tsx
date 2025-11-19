'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { User, Users, Wallet } from 'lucide-react';
import React from 'react';
import { USER_DETAILS } from '@/lib/constants';

type AccountBalanceCardsProps = {
  aliBalance: number;
  fatemehBalance: number;
  sharedBalance: number;
};

export function AccountBalanceCards({ aliBalance, fatemehBalance, sharedBalance }: AccountBalanceCardsProps) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">موجودی {USER_DETAILS.ali.firstName}</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(aliBalance, 'IRT')}</div>
          <p className="text-xs text-muted-foreground">موجودی کل حساب‌های شخصی</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">موجودی {USER_DETAILS.fatemeh.firstName}</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(fatemehBalance, 'IRT')}</div>
          <p className="text-xs text-muted-foreground">موجودی کل حساب‌های شخصی</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">موجودی مشترک</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(sharedBalance, 'IRT')}</div>
          <p className="text-xs text-muted-foreground">موجودی کل حساب‌های مشترک</p>
        </CardContent>
      </Card>
    </>
  );
}
