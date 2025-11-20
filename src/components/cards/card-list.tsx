'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MoreVertical, Wifi } from 'lucide-react';
import type { BankAccount, UserProfile } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
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
} from "@/components/ui/dropdown-menu";
import { useUser } from '@/firebase';
import { USER_DETAILS } from '@/lib/constants';

interface CardListProps {
  cards: BankAccount[];
  onEdit: (card: BankAccount) => void;
  onDelete: (cardId: string) => void;
  users: UserProfile[];
}

const themeClasses = {
    blue: 'from-blue-500 to-blue-700',
    green: 'from-emerald-500 to-green-700',
    purple: 'from-violet-500 to-purple-700',
    orange: 'from-orange-500 to-amber-700',
    gray: 'from-slate-600 to-gray-800',
};


const ChipIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="36" viewBox="0 0 48 36" fill="none">
        <rect x="0.5" y="0.5" width="47" height="35" rx="4.5" fill="#D9D9D9" stroke="#A6A6A6"/>
        <path d="M24 0V36" stroke="#A6A6A6" strokeWidth="0.5"/>
        <path d="M24 18H0" stroke="#A6A6A6" strokeWidth="0.5"/>
        <path d="M24 18H48" stroke="#A6A6A6" strokeWidth="0.5"/>
        <path d="M12 9H36" stroke="#A6A6A6" strokeWidth="0.5"/>
        <path d="M12 27H36" stroke="#A6A6A6" strokeWidth="0.5"/>
    </svg>
);

const formatCardNumber = (cardNumber?: string) => {
    if (!cardNumber) return '';
    return cardNumber.replace(/(\d{4})/g, '$1 ').trim();
};


export function CardList({ cards, onEdit, onDelete, users }: CardListProps) {
  const { user } = useUser();

  const getOwnerName = (card: BankAccount) => {
    if (card.isShared) return "حساب مشترک";
    const owner = users.find(u => u.id === card.userId);
    return owner ? `${owner.firstName} ${owner.lastName}` : "ناشناس";
  };
  
  const sortedCards = [...(cards || [])].sort((a, b) => {
    if (a.isShared && !b.isShared) return 1;
    if (!a.isShared && b.isShared) return -1;
    const ownerA = users.find(u => u.id === a.userId)?.firstName || '';
    const ownerB = users.find(u => u.id === b.userId)?.firstName || '';
    if (ownerA < ownerB) return -1;
    if (ownerA > ownerB) return 1;
    return 0;
  });

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
        {sortedCards.map((card) => (
            <div key={card.id} className={cn("relative rounded-xl p-6 text-white flex flex-col justify-between shadow-lg aspect-[1.586] bg-gradient-to-br transition-all hover:scale-[1.02]", themeClasses[card.theme || 'blue'])}>
                <div className="absolute inset-0 bg-black/10 rounded-xl"></div>
                <div className='relative z-10 flex justify-between items-start'>
                    <span className="font-bold text-lg tracking-wider">{card.bankName}</span>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 hover:text-white" aria-label="Actions">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(card)}>
                                <Edit className="ml-2 h-4 w-4" />
                                ویرایش
                            </DropdownMenuItem>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-destructive focus:text-destructive"
                                        data-cy="delete-card-trigger"
                                    >
                                        <Trash2 className="ml-2 h-4 w-4" />
                                        حذف
                                    </DropdownMenuItem>
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
                                        <AlertDialogAction onClick={() => onDelete(card.id)}>
                                            بله، حذف کن
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                       <ChipIcon />
                       <Wifi className="h-8 w-8 -rotate-45" />
                    </div>

                    <p className="text-2xl font-mono tracking-widest font-bold text-center" dir="ltr">
                        {formatCardNumber(card.cardNumber)}
                    </p>

                    <div className="flex justify-between items-end text-xs font-mono" dir="ltr">
                        <div>
                            <p className="opacity-70">CVV2</p>
                            <p>{card.cvv2}</p>
                        </div>
                         <div>
                            <p className="opacity-70">EXPIRES</p>
                            <p>{card.expiryDate}</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-end pt-2">
                        <span className="font-mono text-sm tracking-wider uppercase">{getOwnerName(card)}</span>
                        <div className='text-left'>
                            <p className="text-xl font-mono tracking-widest font-bold">{formatCurrency(card.balance, 'IRT').replace(' تومان', '')}</p>
                            <p className="text-xs opacity-80">موجودی</p>
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
  );
}
