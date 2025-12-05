
'use client';

import React from 'react';
import type { Check, Loan, PreviousDebt, OwnerId } from '@/lib/types';
import { formatCurrency, formatJalaliDate, toPersianDigits } from '@/lib/utils';
import { differenceInDays, isPast, isToday } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Handshake, Landmark, HandCoins, AlertTriangle, User, Users } from 'lucide-react';
import { USER_DETAILS } from '@/lib/constants';

export type Deadline = {
  id: string;
  type: 'check' | 'loan' | 'debt';
  date: Date;
  title: string;
  amount: number;
  details: {
    ownerId: OwnerId | 'shared_account'; // The actual account owner
    expenseFor: OwnerId; // The beneficiary
    bankAccountName: string;
    registeredBy: string;
  };
  originalItem: Check | Loan | PreviousDebt;
};

interface DueDatesListProps {
  deadlines: Deadline[];
  onAction: (item: Deadline) => void;
}

const ItemIcon = ({ type }: { type: Deadline['type'] }) => {
  const baseClasses = "h-8 w-8";
  switch (type) {
    case 'check':
      return <FileText className={`${baseClasses} text-amber-600`} />;
    case 'loan':
      return <Landmark className={`${baseClasses} text-sky-600`} />;
    case 'debt':
      return <Handshake className={`${baseClasses} text-indigo-600`} />;
  }
};

const getOwnerDetails = (ownerId: OwnerId | 'shared_account') => {
    if (ownerId === 'shared' || ownerId === 'shared_account') return { name: "مشترک", Icon: Users };
    const userDetail = USER_DETAILS[ownerId as 'ali' | 'fatemeh'];
    if (!userDetail) return { name: "ناشناس", Icon: User };
    return { name: userDetail.firstName, Icon: User };
};

const renderStatus = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    const daysDiff = differenceInDays(dueDate, today);

    if (daysDiff === 0) {
      return <span className="font-bold text-amber-600">امروز</span>;
    }
    if (daysDiff < 0) {
      return <span className="text-destructive font-bold flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{toPersianDigits(Math.abs(daysDiff))} روز گذشته</span>;
    }
    return <span className="text-muted-foreground">{toPersianDigits(daysDiff)} روز دیگر</span>;
};

export function DueDatesList({ deadlines, onAction }: DueDatesListProps) {
  if (deadlines.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex h-48 flex-col items-center justify-center gap-4 text-center">
            <HandCoins className="h-16 w-16 text-emerald-500" />
            <h3 className="text-xl font-bold">تبریک!</h3>
            <p className="text-muted-foreground">شما هیچ تعهد مالی نزدیک یا پرداخت معوقی ندارید.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {deadlines.map((item) => {
        const { Icon: OwnerIcon, name: ownerName } = getOwnerDetails(item.details.ownerId);
        const { Icon: BeneficiaryIcon, name: beneficiaryName } = getOwnerDetails(item.details.expenseFor);
        const isOverdue = isPast(item.date) && !isToday(item.date);
        
        let cardClasses = "shadow-md transition-shadow hover:shadow-lg";
        let titleClasses = "font-bold";
        if(isOverdue) {
            cardClasses += " border-destructive bg-destructive/5";
            titleClasses += " text-destructive";
        }


        return (
            <Card key={`${item.type}-${item.id}`} className={cardClasses}>
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-grow">
                        <ItemIcon type={item.type} />
                        <div className="space-y-1.5 flex-grow">
                            <p className={titleClasses}>{item.title}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {item.type === 'check' && (
                                  <div className="flex items-center gap-1" title="صاحب حساب">
                                    <OwnerIcon className="h-4 w-4" />
                                    <span>{ownerName}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1" title="برای">
                                    <BeneficiaryIcon className="h-4 w-4" />
                                    <span>{beneficiaryName}</span>
                                </div>
                                {item.details.bankAccountName !== '---' && (
                                    <div className="flex items-center gap-1" title="از حساب">
                                        <Landmark className="h-4 w-4" />
                                        <span>{item.details.bankAccountName}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1" title="ثبت توسط">
                                    <User className="h-4 w-4" />
                                    <span>{item.details.registeredBy}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end sm:gap-6">
                        <div className='text-center sm:text-right'>
                            <p className="font-bold text-lg font-mono tracking-tighter">{formatCurrency(item.amount, 'IRT')}</p>
                            <p className="text-xs">{renderStatus(item.date)}</p>
                        </div>
                        <Button onClick={() => onAction(item)} size="sm">
                            {item.type === 'check' ? 'مدیریت چک' : 'پرداخت'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
      )})}
    </div>
  );
}
