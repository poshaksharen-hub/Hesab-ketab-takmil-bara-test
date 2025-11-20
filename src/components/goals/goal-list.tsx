
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, CheckCircle, RotateCcw, Target, PlusCircle, User, Users, ArrowLeft } from 'lucide-react';
import type { FinancialGoal, OwnerId } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
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
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';


interface GoalListProps {
  goals: FinancialGoal[];
  onContribute: (goal: FinancialGoal) => void;
  onAchieve: (goal: FinancialGoal) => void;
  onRevert: (goal: FinancialGoal) => void;
}

export function GoalList({ goals, onContribute, onAchieve, onRevert }: GoalListProps) {
  
  if (goals.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">لیست اهداف مالی</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ هدفی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  const getPriorityBadge = (priority: 'low' | 'medium' | 'high') => {
      switch(priority) {
          case 'low': return <Badge variant="secondary">پایین</Badge>
          case 'medium': return <Badge className="bg-amber-500 text-white">متوسط</Badge>
          case 'high': return <Badge variant="destructive">بالا</Badge>
      }
  }

  const getOwnerDetails = (ownerId: OwnerId) => {
    if (ownerId === 'shared') return { name: "مشترک", Icon: Users };
    const userDetail = USER_DETAILS[ownerId];
    if (!userDetail) return { name: "ناشناس", Icon: User };
    return { name: userDetail.firstName, Icon: User };
  };


  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {goals.map((goal) => {
            const progress = (goal.targetAmount > 0) ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const isAchieved = goal.isAchieved;
            const { name: ownerName, Icon: OwnerIcon } = getOwnerDetails(goal.ownerId);

            return (
            <div key={goal.id} className="relative group">
              <Link href={`/goals/${goal.id}`} className="block cursor-pointer">
                <Card className={cn("flex flex-col justify-between shadow-lg h-full transition-shadow duration-300 group-hover:shadow-xl", isAchieved && "bg-muted/50")}>
                    <CardHeader>
                        <div className='flex justify-between items-start'>
                            <div className="space-y-1">
                                <CardTitle className={cn("flex items-center gap-2", isAchieved && "text-muted-foreground line-through")}>
                                    <OwnerIcon className="h-5 w-5 text-muted-foreground" />
                                    <span>{goal.name}</span>
                                </CardTitle>
                                <CardDescription>
                                    <span className='ml-2'>هدف برای: {ownerName}</span>
                                    |
                                    <span className='mr-2'>اولویت: {getPriorityBadge(goal.priority)}</span>
                                </CardDescription>
                            </div>
                            <div className="flex gap-1">
                                {isAchieved ? (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                           <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="inline-block">
                                                <Button variant="ghost" size="icon" aria-label="بازگردانی هدف">
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>آیا از بازگردانی این هدف مطمئن هستید؟</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                با این کار، وضعیت هدف به حالت "در حال پیشرفت" برمی‌گردد و هزینه(های) ثبت شده برای آن حذف خواهد شد. همچنین مبالغ پرداخت شده به حساب‌های شما بازگردانده می‌شود.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                                            <AlertDialogAction onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRevert(goal); }}>
                                                بله، بازگردانی کن
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowLeft className="h-4 w-4" />
                                   </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{formatCurrency(goal.currentAmount, 'IRT')}</span>
                                <span>{formatCurrency(goal.targetAmount, 'IRT')}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                             <div className="flex justify-between text-xs text-muted-foreground text-center">
                                <span>{Math.round(progress)}٪ تکمیل شده</span>
                                <span>تا تاریخ: {formatJalaliDate(new Date(goal.targetDate))}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-2">
                        {isAchieved ? (
                            <div className="col-span-2 flex items-center justify-center text-emerald-600 gap-2">
                                <CheckCircle className="h-5 w-5" />
                                <span className='font-bold'>هدف محقق شد!</span>
                            </div>
                        ) : (
                            <>
                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); onContribute(goal); }}>
                                    <Button className="w-full" variant="outline">
                                        <PlusCircle className="ml-2 h-4 w-4" />
                                        افزودن به پس‌انداز
                                    </Button>
                                </div>
                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAchieve(goal); }}>
                                    <Button className="w-full">
                                        <Target className="ml-2 h-4 w-4" />
                                        رسیدم به هدف!
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardFooter>
                </Card>
              </Link>
            </div>
        )})}
    </div>
  );
}
