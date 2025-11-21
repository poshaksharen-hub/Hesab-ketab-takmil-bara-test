
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MoreVertical, Wifi, Users, User, PiggyBank, BadgeAlert, WalletCards, ArrowRight, History } from 'lucide-react';
import type { BankAccount, UserProfile, OwnerId, FinancialGoal } from '@/lib/types';
import { formatCurrency, cn, formatJalaliDate } from '@/lib/utils';
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
import { Separator } from '../ui/separator';

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

function CardItem({ card, onEdit, onDelete, users, goals }: { card: BankAccount; onEdit: (card: BankAccount) => void; onDelete: (cardId: string) => void; users: UserProfile[]; goals: FinancialGoal[]}) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

    const getOwnerDetails = (ownerId: OwnerId) => {
        if (ownerId === 'shared') return { name: "حساب مشترک", Icon: Users };
        const userDetail = USER_DETAILS[ownerId];
        return { name: `${userDetail.firstName} ${userDetail.lastName}`, Icon: User };
    };
    
    const { name: ownerName, Icon: OwnerIcon } = getOwnerDetails(card.ownerId);

    const goalContributions = (goals || [])
        .filter(g => !g.isAchieved)
        .flatMap(g => 
            (g.contributions || [])
             .filter(c => c.bankAccountId === card.id)
             .map(c => ({...c, goalName: g.name, goalOwnerId: g.ownerId}))
    );
    const blockedForGoals = goalContributions.reduce((sum, c) => sum + c.amount, 0);
    const availableBalance = card.balance - blockedForGoals;

    return (
        <>
            <div className="relative group">
                <div className={cn("relative rounded-xl p-6 text-white flex flex-col justify-between shadow-lg aspect-[1.586] bg-gradient-to-br transition-transform", themeClasses[card.theme || 'blue'])}>
                    <div className="absolute inset-0 bg-black/10 rounded-xl"></div>
                    <div className='relative z-10 flex justify-between items-start'>
                        <span className="font-bold text-lg tracking-wider">{card.bankName}</span>
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
                                     <DropdownMenuItem asChild>
                                        <Link href={`/cards/${card.id}`}>
                                            <History className="ml-2 h-4 w-4" />
                                            مشاهده تاریخچه
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onSelect={() => setIsDeleteDialogOpen(true)}
                                        className="text-destructive focus:text-destructive"
                                        data-cy="delete-card-trigger"
                                    >
                                        <Trash2 className="ml-2 h-4 w-4" />
                                        حذف کارت
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
                            <span className="font-mono text-sm tracking-wider uppercase flex items-center gap-1">
                                <OwnerIcon className="w-4 h-4" />
                                {ownerName}
                            </span>
                            <div className='text-left'>
                                <p className="text-xl font-mono tracking-widest font-bold">{formatCurrency(card.balance, 'IRT').replace(' تومان', '')}</p>
                                <p className="text-xs opacity-80">موجودی کل</p>
                            </div>
                        </div>
                    </div>
                </div>

                {blockedForGoals > 0 && (
                    <div className="bg-muted p-4 rounded-b-xl border-t mt-[-2px] space-y-3">
                       <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="border-r pr-2">
                               <p className="text-sm font-semibold text-destructive">{formatCurrency(blockedForGoals, 'IRT')}</p>
                               <p className="text-xs text-muted-foreground">مسدود برای اهداف</p>
                            </div>
                            <div>
                               <p className="text-sm font-semibold text-emerald-600">{formatCurrency(availableBalance, 'IRT')}</p>
                               <p className="text-xs text-muted-foreground">موجودی قابل استفاده</p>
                            </div>
                       </div>
                       <Separator />
                       <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground">جزئیات مبالغ مسدود شده:</p>
                             {goalContributions.map((contrib, index) => (
                                <div key={index} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2">
                                        <PiggyBank className="w-4 h-4 text-primary" />
                                        <span>{contrib.goalName} ({USER_DETAILS[contrib.goalOwnerId]?.firstName})</span>
                                    </div>
                                    <span className="font-mono text-destructive">{formatCurrency(contrib.amount, 'IRT')}</span>
                                </div>
                            ))}
                       </div>
                    </div>
                )}
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
            <CardItem key={card.id} card={card} onEdit={onEdit} onDelete={onDelete} users={users} goals={goals} />
        ))}
    </div>
  );
}
