
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, CheckCircle, RotateCcw, Target } from 'lucide-react';
import type { FinancialGoal } from '@/lib/types';
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
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GoalListProps {
  goals: FinancialGoal[];
  onEdit: (goal: FinancialGoal) => void;
  onDelete: (goal: FinancialGoal) => void;
  onAchieve: (goal: FinancialGoal) => void;
  onRevert: (goal: FinancialGoal) => void;
}

export function GoalList({ goals, onEdit, onDelete, onAchieve, onRevert }: GoalListProps) {
  
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

  return (
    <TooltipProvider>
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {goals.map((goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const isAchieved = goal.isAchieved;

            return (
            <Card key={goal.id} className={cn("flex flex-col justify-between shadow-lg", isAchieved && "bg-muted/50")}>
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div className="space-y-1">
                            <CardTitle className={cn(isAchieved && "text-muted-foreground line-through")}>{goal.name}</CardTitle>
                            <CardDescription>
                                <span className='ml-2'>تا تاریخ: {formatJalaliDate(new Date(goal.targetDate))}</span>
                                |
                                <span className='mr-2'>اولویت: {getPriorityBadge(goal.priority)}</span>
                            </CardDescription>
                        </div>
                        <div className="flex gap-1">
                            {isAchieved ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>آیا از بازگردانی این هدف مطمئن هستید؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            با این کار، وضعیت هدف به حالت "در حال پیشرفت" برمی‌گردد و هزینه ثبت شده برای آن حذف خواهد شد. همچنین مبالغ پرداخت شده به حساب‌های شما بازگردانده می‌شود.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>انصراف</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onRevert(goal)}>
                                            بله، بازگردانی کن
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => onEdit(goal)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isAchieved}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>آیا از حذف این هدف مطمئن هستید؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        این عمل قابل بازگشت نیست. اگر مبلغی برای این هدف مسدود شده باشد، آزاد خواهد شد.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>انصراف</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(goal)}>
                                        بله، حذف کن
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
                         <div className="text-xs text-muted-foreground text-center">
                            {Math.round(progress)}٪ تکمیل شده
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    {isAchieved ? (
                        <div className="flex items-center text-emerald-600 gap-2">
                            <CheckCircle className="h-5 w-5" />
                            <span className='font-bold'>هدف محقق شد!</span>
                        </div>
                    ) : (
                        <Button className="w-full" onClick={() => onAchieve(goal)}>
                            <Target className="ml-2 h-4 w-4" />
                            رسیدم به هدف!
                        </Button>
                    )}
                </CardFooter>
            </Card>
        )})}
    </div>
    </TooltipProvider>
  );
}
