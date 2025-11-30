
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MoreVertical, Wifi, Users, User, History, Copy, WalletCards, PiggyBank } from 'lucide-react';
import type { BankAccount, UserProfile, OwnerId, FinancialGoal } from '@/lib/types';
import { formatCurrency, cn, formatCardNumber } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const themeClasses = {
    blue: 'from-blue-500 to-blue-700',
    green: 'from-emerald-500 to-green-700',
    purple: 'from-violet-500 to-purple-700',
    orange: 'from-orange-500 to-amber-700',
    gray: 'from-slate-600 to-gray-800',
};

const ChipIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="36" viewBox="0 0 48 36" fill="none" className="w-10 h-auto sm:w-12">
        <rect x="0.5" y="0.5" width="47" height="35" rx="4.5" fill="#D9D9D9" stroke="#A6A6A6"/>
        <path d="M24 0V36" stroke="#A6A6A6" strokeWidth="0.5"/>
        <path d="M24 18H0" stroke="#A6A6A6" strokeWidth="0.5"/>
        <path d="M24 18H48" stroke="#A6A6A6" strokeWidth="0.5"/>
        <path d="M12 9H36" stroke="#A6A6A6" strokeWidth="0.5"/>
        <path d="M12 27H36" stroke="#A6A6A6" strokeWidth="0.5"/>
    </svg>
);

function CardItem({ card, onEdit, onDelete }: { card: BankAccount; onEdit: (card: BankAccount) => void; onDelete: (cardId: string) => void;}) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "کپی شد",
            description: `${label} در کلیپ‌بورد کپی شد.`,
        });
    };

    const getOwnerDetails = (ownerId: OwnerId) => {
        if (ownerId === 'shared') return { name: "حساب مشترک", Icon: Users };
        const userDetail = USER_DETAILS[ownerId];
        return { name: `${userDetail.firstName} ${userDetail.lastName}`, Icon: User };
    };
    
    const { name: ownerName, Icon: OwnerIcon } = getOwnerDetails(card.ownerId);

    const blockedForGoals = card.blockedBalance || 0;
    const availableBalance = card.balance - blockedForGoals;

    return (
        <>
            <div className="relative group p-1">
                <div className={cn("relative rounded-xl p-4 sm:p-6 text-white flex flex-col justify-between shadow-lg aspect-[1.586] bg-gradient-to-br transition-transform", themeClasses[card.theme || 'blue'])}>
                    <div className="absolute inset-0 bg-black/10 rounded-xl"></div>
                    <div className='relative z-10 flex justify-between items-start'>
                        <span className="font-bold text-base sm:text-lg tracking-wider">{card.bankName}</span>
                         <div onClick={(e) => {e.preventDefault(); e.stopPropagation();}} className="absolute top-2 left-2 z-20">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 hover:text-white" aria-label="Actions">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => onEdit(card)}>
                                        <Edit className="ml-2 h-4 w-4" />
                                        ویرایش کارت
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() => setIsDeleteDialogOpen(true)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="ml-2 h-4 w-4" />
                                        حذف کارت
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    
                    <div className="relative z-10 space-y-1 sm:space-y-2">
                        <div className="flex items-center justify-between">
                           <ChipIcon />
                           <Wifi className="h-6 w-6 sm:h-8 sm:w-8 -rotate-45" />
                        </div>

                        <div className="text-center space-y-1" dir="ltr">
                            <div className="flex items-center justify-center gap-2 font-mono text-xl sm:text-2xl tracking-widest font-bold">
                                <span>{formatCardNumber(card.cardNumber)}</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-xs font-mono tracking-wider opacity-80">
                                <span>{`IR - ${card.accountNumber}`}</span>
                            </div>
                        </div>

                         <div className="flex justify-between items-end text-xs font-mono pt-1" dir="ltr">
                            <div>
                                <p className="opacity-70 text-[10px] sm:text-xs">CVV2</p>
                                <p>{card.cvv2}</p>
                            </div>
                             <div>
                                <p className="opacity-70 text-[10px] sm:text-xs">EXPIRES</p>
                                <p>{card.expiryDate}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-end pt-1 sm:pt-2">
                            <span className="font-mono text-xs sm:text-sm tracking-wider uppercase flex items-center gap-1">
                                <OwnerIcon className="w-4 h-4" />
                                {ownerName}
                            </span>
                            <div className='text-left'>
                                <p className="text-base sm:text-xl font-mono tracking-widest font-bold">{formatCurrency(card.balance, 'IRT').replace(' تومان', '')}</p>
                                <p className="text-[10px] sm:text-xs opacity-80">موجودی کل</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-muted p-4 rounded-b-xl border-t mt-[-2px] space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="border-l pl-2">
                           <p className="text-sm font-semibold text-emerald-600">{formatCurrency(availableBalance, 'IRT')}</p>
                           <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><WalletCards className="w-3 h-3" /> قابل استفاده</p>
                        </div>
                        <div>
                           <p className="text-sm font-semibold text-destructive">{formatCurrency(blockedForGoals, 'IRT')}</p>
                           <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><PiggyBank className="w-3 h-3" /> مسدود برای اهداف</p>
                        </div>
                   </div>
                   <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="ghost" className="w-full" onClick={() => handleCopy(card.cardNumber, 'شماره کارت')}>
                            <Copy className="ml-2 h-4 w-4" />
                            کپی شماره کارت
                        </Button>
                        <Button size="sm" variant="ghost" className="w-full" asChild>
                            <Link href={`/cards/${card.id}`}>
                                <History className="ml-2 h-4 w-4" />
                                تاریخچه
                            </Link>
                        </Button>
                   </div>
                </div>
            </div>
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
        </>
    );
}

interface CardListProps {
  cards: BankAccount[];
  onEdit: (card: BankAccount) => void;
  onDelete: (cardId: string) => void;
  users: UserProfile[];
  goals: FinancialGoal[];
}

export function CardList({ cards, onEdit, onDelete, users, goals }: CardListProps) {

  const sortedCards = [...(cards || [])].sort((a, b) => {
    if (a.ownerId === 'shared' && b.ownerId !== 'shared') return -1;
    if (a.ownerId !== 'shared' && b.ownerId === 'shared') return 1;
    if (a.ownerId < b.ownerId) return -1;
    if (a.ownerId > b.ownerId) return 1;
    return b.balance - a.balance;
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
  
  const sharedCards = sortedCards.filter(c => c.ownerId === 'shared');
  const aliCards = sortedCards.filter(c => c.ownerId === 'ali');
  const fatemehCards = sortedCards.filter(c => c.ownerId === 'fatemeh');

  const renderCardSection = (cardList: BankAccount[], title: string) => {
    if (cardList.length === 0) return null;
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cardList.map((card) => (
                        <CardItem key={card.id} card={card} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className='space-y-6'>
       {renderCardSection(sharedCards, 'کارت‌های مشترک')}
       {renderCardSection(aliCards, `کارت‌های ${USER_DETAILS.ali.firstName}`)}
       {renderCardSection(fatemehCards, `کارت‌های ${USER_DETAILS.fatemeh.firstName}`)}
    </div>
  );
}
