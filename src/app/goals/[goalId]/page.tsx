
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, PiggyBank, Calendar, Landmark, User, Users } from 'lucide-react';
import { formatCurrency, formatJalaliDate, cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { USER_DETAILS } from '@/lib/constants';
import type { FinancialGoal, FinancialGoalContribution, BankAccount, OwnerId } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

function GoalDetailSkeleton() {
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent>
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </CardContent>
      </Card>
    </main>
  );
}

const getUserName = (userId: string): string => {
    if (!userId) return 'نامشخص';
    if (userId === USER_DETAILS.ali.id) return USER_DETAILS.ali.firstName;
    if (userId === USER_DETAILS.fatemeh.id) return USER_DETAILS.fatemeh.firstName;
    return 'سیستم';
};

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.goalId as string;

  const { isLoading, allData } = useDashboardData();
  const { goals, bankAccounts } = allData;

  const { goal, contributionsWithDetails } = useMemo(() => {
    if (isLoading || !goalId) {
      return { goal: null, contributionsWithDetails: [] };
    }

    const currentGoal = goals.find((g) => g.id === goalId);
    if (!currentGoal) return { goal: null, contributionsWithDetails: [] };

    const detailedContributions = (currentGoal.contributions || [])
        .map(c => {
            const bankAccount = bankAccounts.find(b => b.id === c.bankAccountId);
            const ownerId = bankAccount?.ownerId;
            const ownerName = ownerId === 'shared_account' ? 'حساب مشترک' : (ownerId && USER_DETAILS[ownerId as 'ali' | 'fatemeh'] ? `${USER_DETAILS[ownerId as 'ali' | 'fatemeh'].firstName}` : 'ناشناس');
            return {
                ...c,
                bankName: bankAccount?.bankName || 'نامشخص',
                ownerName,
                registeredByName: getUserName(c.registeredByUserId)
            }
        })
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      goal: currentGoal,
      contributionsWithDetails: detailedContributions,
    };
  }, [isLoading, goalId, goals, bankAccounts]);

  if (isLoading) {
    return <GoalDetailSkeleton />;
  }

  if (!goal) {
    return (
      <main className="flex-1 p-4 pt-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>هدف مالی یافت نشد</CardTitle>
          </CardHeader>
          <CardContent>
            <p>متاسفانه هدفی با این مشخصات در سیستم وجود ندارد.</p>
            <Button onClick={() => router.push('/goals')} className="mt-4">
              بازگشت به لیست اهداف
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const getOwnerDetails = (ownerId: OwnerId) => {
    if (ownerId === 'shared') return { name: "مشترک", Icon: Users };
    const userDetail = USER_DETAILS[ownerId as 'ali' | 'fatemeh'];
    if (!userDetail) return { name: "ناشناس", Icon: User };
    return { name: userDetail.firstName, Icon: User };
  };

  const getPriorityBadge = (priority: 'low' | 'medium' | 'high') => {
      switch(priority) {
          case 'low': return <Badge variant="secondary">پایین</Badge>
          case 'medium': return <Badge className="bg-amber-500 text-white">متوسط</Badge>
          case 'high': return <Badge variant="destructive">بالا</Badge>
      }
  }
  
  const { name: ownerName, Icon: OwnerIcon } = getOwnerDetails(goal.ownerId);
  const progress = (goal.targetAmount > 0) ? (goal.currentAmount / goal.targetAmount) * 100 : 0;


  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="space-y-1">
              <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-3">
                 <PiggyBank className="w-8 h-8 text-primary" />
                {goal.name}
              </h1>
              <div className="text-muted-foreground flex items-center gap-4">
                  <div className="flex items-center gap-1"><OwnerIcon className="w-4 h-4" /> <span>هدف برای: {ownerName}</span></div>
                  <span>|</span>
                  <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> <span>تاریخ هدف: {formatJalaliDate(new Date(goal.targetDate))}</span></div>
                  <span>|</span>
                  <div>اولویت: {getPriorityBadge(goal.priority)}</div>
              </div>
            </div>
        </div>
      </div>

       <Card>
            <CardContent className='pt-6'>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                        <span>{formatCurrency(goal.currentAmount, 'IRT')}</span>
                        <span>{formatCurrency(goal.targetAmount, 'IRT')}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground text-center">
                        <span>{`${progress.toFixed(0)}٪ تکمیل شده`}</span>
                        {goal.isAchieved && goal.actualCost ? 
                            <span className='font-bold text-emerald-600'>هزینه نهایی: {formatCurrency(goal.actualCost, 'IRT')}</span>
                            :
                            <span>مبلغ باقی‌مانده: <span className='font-bold'>{formatCurrency(goal.targetAmount - goal.currentAmount, 'IRT')}</span></span>
                        }
                    </div>
                </div>
            </CardContent>
       </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>تاریخچه پس‌اندازها</CardTitle>
              <CardDescription>تمام مبالغی که برای رسیدن به این هدف کنار گذاشته‌اید.</CardDescription>
          </CardHeader>
          <CardContent>
               <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>تاریخ پس‌انداز</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>از حساب</TableHead>
                    <TableHead>صاحب حساب</TableHead>
                    <TableHead className="text-left">ثبت توسط</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {contributionsWithDetails.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                هنوز هیچ مبلغی برای این هدف پس‌انداز نشده است.
                            </TableCell>
                        </TableRow>
                    ) : (
                    contributionsWithDetails.map((contrib, index) => (
                    <TableRow key={index}>
                        <TableCell>{formatJalaliDate(new Date(contrib.date))}</TableCell>
                        <TableCell className="font-medium font-mono">{formatCurrency(contrib.amount, 'IRT')}</TableCell>
                        <TableCell>{contrib.bankName}</TableCell>
                        <TableCell>{contrib.ownerName}</TableCell>
                        <TableCell className="text-left">{contrib.registeredByName}</TableCell>
                    </TableRow>
                    )))}
                </TableBody>
                </Table>
          </CardContent>
      </Card>
    </main>
  );
}
