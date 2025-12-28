
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, CheckCircle, RotateCcw, Target, PlusCircle, User, Users, History, MoreVertical, PenSquare } from 'lucide-react';
import type { FinancialGoal, OwnerId, UserProfile } from '@/lib/types';
import { formatCurrency, formatJalaliDate, getPublicUrl } from '@/lib/utils';
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
import Image from 'next/image'; // <-- Import Next.js Image component

interface GoalListProps {
  goals: FinancialGoal[];
  onContribute: (goal: FinancialGoal) => void;
  onAchieve: (goal: FinancialGoal) => void;
  onRevert: (goal: FinancialGoal) => void;
  onDelete: (goalId: string) => void;
  users: UserProfile[];
  isSubmitting: boolean;
}

export function GoalList({ goals, onContribute, onAchieve, onRevert, onDelete, users, isSubmitting }: GoalListProps) {
  
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

  // ... (helper functions like getPriorityBadge, getOwnerDetails remain the same)

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {goals.sort(/* ... */).map((goal) => {
            const progress = (goal.targetAmount > 0) ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const isAchieved = goal.isAchieved;
            const imageUrl = goal.image_path ? getPublicUrl(goal.image_path) : null; // <-- Get the public URL

            return (
            <div key={goal.id} className="relative group">
                 <Link href={`/goals/${goal.id}`} className="block h-full cursor-pointer" aria-label={`View details for goal ${goal.name}`}>
                    <Card className={cn("flex flex-col justify-between shadow-lg h-full transition-shadow duration-300 group-hover:shadow-xl overflow-hidden", isAchieved && "bg-muted/50")}>
                        <div> {/* Wrapper for top part of the card */}
                            {/* --- NEW IMAGE DISPLAY --- */}
                            {imageUrl && (
                                <div className="relative w-full h-40"> 
                                    <Image 
                                        src={imageUrl} 
                                        alt={`Image for ${goal.name}`} 
                                        layout="fill" 
                                        objectFit="cover" 
                                        className="transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                            )}
                            <CardHeader>
                                {/* ... (CardHeader content remains the same) ... */}
                            </CardHeader>
                            <CardContent>
                                {/* ... (CardContent content remains the same) ... */}
                            </CardContent>
                        </div>
                        <CardFooter className="grid grid-cols-2 gap-2 mt-auto">
                           {/* ... (CardFooter content remains the same) ... */}
                        </CardFooter>
                    </Card>
                 </Link>
            </div>
        )})}
    </div>
  );
}
