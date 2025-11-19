'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, EyeOff, MoreVertical } from 'lucide-react';
import type { BankAccount, UserProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
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
import { USER_DETAILS } from '@/lib/constants';
import { useUser } from '@/firebase';

interface CardListProps {
  cards: BankAccount[];
  onEdit: (card: BankAccount) => void;
  onDelete: (cardId: string, isShared: boolean) => void;
  users: UserProfile[];
}

export function CardList({ cards, onEdit, onDelete, users }: CardListProps) {
  const { user } = useUser();

  const getOwnerName = (card: BankAccount) => {
    if (card.isShared) return "مشترک";
    const owner = users.find(u => u.id === card.userId);
    return owner?.firstName || "ناشناس";
  };

  if (cards.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">لیست کارت‌ها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ کارتی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {cards.map((card) => (
            <Card key={card.id} className="flex flex-col justify-between shadow-lg">
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div>
                            <CardTitle>{card.name}</CardTitle>
                            <CardDescription>
                                {getOwnerName(card)}
                            </CardDescription>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(card)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>آیا از حذف این کارت مطمئن هستید؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        این عمل قابل بازگشت نیست. این کارت برای همیشه حذف خواهد شد.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>انصراف</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(card.id, !!card.isShared)}>
                                        بله، حذف کن
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className='text-center my-4'>
                            <p className="text-sm text-muted-foreground">موجودی کل</p>
                            <p className="text-3xl font-bold tracking-tight">{formatCurrency(card.balance, 'IRT')}</p>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">موجودی مسدود شده</span>
                            <span>{formatCurrency(card.blockedBalance || 0, 'IRT')}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base">
                            <span className="text-muted-foreground">موجودی در دسترس</span>
                            <span>{formatCurrency(card.balance - (card.blockedBalance || 0), 'IRT')}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
  );
}
