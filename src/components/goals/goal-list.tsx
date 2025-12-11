
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, CheckCircle, RotateCcw, Target, PlusCircle, User, Users, ArrowLeft, History, MoreVertical, PenSquare } from 'lucide-react';
import type { FinancialGoal, OwnerId, UserProfile } from '@/lib/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';


interface GoalListProps {
  goals: FinancialGoal[];
  onContribute: (goal: FinancialGoal) => void;
  onAchieve: (goal: FinancialGoal) => void;
  onRevert: (goal: FinancialGoal) => void;
  onDelete: (goalId: string) => void;
  users: UserProfile[]; // Keep for future use, not needed for getUserName now
}

const getUserName = (userId: string): string => {
    if (!userId) return 'نامشخص';
    if (userId === USER_DETAILS.ali.id) return USER_DETAILS.ali.firstName;
    if (userId === USER_DETAILS.fatemeh.id) return USER_DETAILS.fatemeh.firstName;
    return 'سیستم';
};

export function GoalList({ goals, onContribute, onAchieve, onRevert, onDelete }: GoalListProps) {
  
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
    const userDetail = USER_DETAILS[ownerId as 'ali' | 'fatemeh'];
    if (!userDetail) return { name: "ناشناس", Icon: User };
    return { name: userDetail.firstName, Icon: User };
  };


  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {goals.sort((a, b) => (a.isAchieved ? 1 : -1) - (b.isAchieved ? 1 : -1) || new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime()).map((goal) => {
            const progress = (goal.targetAmount > 0) ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const isAchieved = goal.isAchieved;
            const { name: ownerName, Icon: OwnerIcon } = getOwnerDetails(goal.ownerId);

            return (
            <div key={goal.id} className="relative group">
                 <Link href={`/goals/${goal.id}`} className="block h-full cursor-pointer" aria-label={`View details for goal ${goal.name}`}>
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
                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                         <DropdownMenuItem onSelect={(e) => { e.preventDefault(); const router = (e.target as HTMLElement).closest('a')?.href; if (router) window.location.href = router; }}>
                                            <History className="ml-2 h-4 w-4" />
                                            مشاهده تاریخچه
                                        </DropdownMenuItem>
                                        {!isAchieved && (
                                            <DropdownMenuItem disabled>
                                                <Edit className="ml-2 h-4 w-4" />
                                                ویرایش هدف (غیرفعال)
                                            </DropdownMenuItem>
                                        )}
                                        {isAchieved && (
                                            <DropdownMenuItem onSelect={() => onRevert(goal)}>
                                                <RotateCcw className="ml-2 h-4 w-4" />
                                                بازگردانی هدف
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <div className={cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "text-destructive focus:text-destructive")}>
                                                    <Trash2 className="ml-2 h-4 w-4" />
                                                    حذف هدف
                                                </div>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>آیا از حذف این هدف مطمئن هستید؟</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    این عمل قابل بازگشت نیست. اگر هدف محقق شده باشد، ابتدا باید آن را بازگردانی کنید. در غیر این صورت، تمام مبالغ مسدود شده برای این هدف آزاد خواهند شد.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive hover:bg-destructive/90"
                                                    disabled={goal.isAchieved}
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(goal.id); }}>
                                                    بله، حذف کن
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                                <div className="flex justify-between items-center text-xs text-muted-foreground text-center">
                                    <span>{Math.round(progress)}٪ تکمیل شده</span>
                                    <div className="flex items-center gap-1" title={`ثبت توسط: ${getUserName(goal.registeredByUserId)}`}>
                                    <PenSquare className="h-3 w-3" />
                                    <span>{getUserName(goal.registeredByUserId)}</span>
                                    </div>
                                    <span>تا: {formatJalaliDate(new Date(goal.targetDate))}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="grid grid-cols-2 gap-2">
                            {isAchieved ? (
                                <div className="col-span-2 flex items-center justify-center text-emerald-600 gap-2 font-bold">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>هدف محقق شد!</span>
                                </div>
                            ) : (
                                <>
                                    <Button className="w-full" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onContribute(goal); }}>
                                        <PlusCircle className="ml-2 h-4 w-4" />
                                        افزودن به پس‌انداز
                                    </Button>
                                    <Button className="w-full" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAchieve(goal); }}>
                                        <Target className="ml-2 h-4 w-4" />
                                        رسیدم به هدف!
                                    </Button>
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
