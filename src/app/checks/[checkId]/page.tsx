
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookCopy, HandCoins, Landmark, AlertCircle, Calendar, User, Users, FolderKanban } from 'lucide-react';
import { formatCurrency, formatJalaliDate, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { USER_DETAILS } from '@/lib/constants';

function CheckDetailSkeleton() {
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent>
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function CheckDetailPage() {
  const router = useRouter();
  const params = useParams();
  const checkId = params.checkId as string;

  const { isLoading, allData } = useDashboardData();
  const { checks, bankAccounts, payees, categories } = allData;

  const { check } = useMemo(() => {
    if (isLoading || !checkId) {
      return { check: null };
    }
    const currentCheck = checks.find((c) => c.id === checkId);
    return { check: currentCheck };
  }, [isLoading, checkId, checks]);

  if (isLoading) {
    return <CheckDetailSkeleton />;
  }

  if (!check) {
    return (
      <main className="flex-1 p-4 pt-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>چک یافت نشد</CardTitle>
          </CardHeader>
          <CardContent>
            <p>متاسفانه چکی با این مشخصات در سیستم وجود ندارد.</p>
            <Button onClick={() => router.push('/checks')} className="mt-4">
              بازگشت به لیست چک‌ها
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const getPayeeName = (payeeId?: string) => {
    if (!payeeId) return 'نامشخص';
    return payees.find(p => p.id === payeeId)?.name || 'نامشخص';
  };
  
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'نامشخص';
    return categories.find(c => c.id === categoryId)?.name || 'نامشخص';
  }

  const getBankAccount = (bankAccountId?: string) => {
    if (!bankAccountId) return null;
    return bankAccounts.find(b => b.id === bankAccountId);
  }

  const getOwnerDetails = (ownerId: 'ali' | 'fatemeh' | 'shared') => {
    if (ownerId === 'shared') return { name: "مشترک", Icon: Users };
    const userDetail = USER_DETAILS[ownerId];
    if (!userDetail) return { name: "ناشناس", Icon: User };
    return { name: userDetail.firstName, Icon: User };
  };
  
  const bankAccount = getBankAccount(check.bankAccountId);
  const { name: ownerName, Icon: OwnerIcon } = getOwnerDetails(check.ownerId);

  const getStatusBadge = (status: 'pending' | 'cleared') => {
      switch(status) {
          case 'pending': return <Badge variant="destructive">در انتظار پاس</Badge>;
          case 'cleared': return <Badge className="bg-emerald-500 text-white">پاس شده</Badge>;
      }
  }

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            جزئیات چک
          </h1>
          <div className="text-muted-foreground flex items-center gap-2">
            <span>{check.description || `چک به ${getPayeeName(check.payeeId)}`}</span>
            {getStatusBadge(check.status)}
          </div>
        </div>
        <Button onClick={() => router.push('/checks')} variant="outline">
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به لیست
        </Button>
      </div>

       <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مبلغ چک</CardTitle>
                <HandCoins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(check.amount, 'IRT')}</div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">تاریخ سررسید</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold font-mono">{formatJalaliDate(new Date(check.dueDate))}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">طرف حساب</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-lg font-bold">{getPayeeName(check.payeeId)}</div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">دسته‌بندی</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-lg font-bold">{getCategoryName(check.categoryId)}</div>
            </CardContent>
        </Card>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>اطلاعات حساب و صیادی</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
               <div className="flex items-center gap-3">
                    <Landmark className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">از حساب بانکی</p>
                        <p className="font-semibold">{bankAccount?.bankName || 'نامشخص'}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <OwnerIcon className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">تعهد برای</p>
                        <p className="font-semibold">{ownerName}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <BookCopy className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">شماره صیادی</p>
                        <p className="font-semibold font-mono tracking-wider">{check.sayadId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <BookCopy className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">شماره سریال چک</p>
                        <p className="font-semibold font-mono tracking-wider">{check.checkSerialNumber}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">تاریخ صدور</p>
                        <p className="font-semibold font-mono">{formatJalaliDate(new Date(check.issueDate))}</p>
                    </div>
                </div>
                {check.clearedDate && (
                    <div className="flex items-center gap-3">
                        <Calendar className="h-6 w-6 text-emerald-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">تاریخ پاس شدن</p>
                            <p className="font-semibold font-mono">{formatJalaliDate(new Date(check.clearedDate))}</p>
                        </div>
                    </div>
                )}
          </CardContent>
      </Card>
    </main>
  );
}
