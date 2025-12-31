
'use client';

import React from 'react';
import type { Check, BankAccount } from '@/lib/types';
import { formatCurrency, formatJalaliDate, cn, amountToWords } from '@/lib/utils';
import { HesabKetabLogo } from '../icons';
import Image from 'next/image';

interface CheckPaperProps {
    check: Check;
    bankAccount?: BankAccount;
    payeeName: string;
    ownerName: string;
    expenseForName: string;
    categoryName: string;
    signatureImage?: string;
}

export function CheckPaper({
    check,
    bankAccount,
    payeeName,
    ownerName,
    expenseForName,
    categoryName,
    signatureImage,
}: CheckPaperProps) {
    
    const isCleared = check.status === 'cleared';

    return (
        <div className={cn("overflow-hidden shadow-lg h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-2 border-gray-300 dark:border-gray-700", isCleared && "opacity-60")}>
            {isCleared && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-12 border-4 border-emerald-500 text-emerald-500 rounded-lg p-2 text-3xl md:text-4xl font-black uppercase opacity-60 select-none z-20">
                    پاس شد
                </div>
            )}
            
            <div className="p-3 relative bg-gray-100 dark:bg-gray-800/50 flex justify-between items-start">
                <div className="text-left w-1/3 space-y-1">
                    <p className="text-[10px] md:text-xs text-muted-foreground font-sans">شناسه صیاد: <span className="font-mono font-bold tracking-wider text-foreground block">{check.sayadId}</span></p>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-sans">سریال چک: <span className="font-mono font-bold tracking-tight text-foreground block">{check.checkSerialNumber}</span></p>
                </div>
                <div className="text-center w-1/3">
                    <HesabKetabLogo className="w-6 h-6 mx-auto text-primary/70" />
                    <p className="font-bold font-body text-sm md:text-base">{bankAccount?.bankName}</p>
                </div>
                <div className="text-right w-1/3 flex flex-col items-end">
                     <p className="text-xs md:text-sm text-muted-foreground font-body">سررسید:</p>
                     <p className="font-handwriting font-bold text-base md:text-lg">{formatJalaliDate(new Date(check.dueDate))}</p>
                </div>
            </div>
            
            <div className="p-4 space-y-2 flex-grow flex flex-col text-sm">
                 <div className="flex items-baseline gap-2 border-b-2 border-dotted border-gray-400 pb-1 font-body text-xs md:text-sm">
                    <span className="shrink-0">به موجب این چک مبلغ</span>
                    <span className="font-handwriting font-bold text-sm md:text-base text-center flex-grow px-1">
                        {amountToWords(check.amount)}
                    </span>
                    <span className="shrink-0">تومان</span>
                 </div>
                 <div className="flex items-baseline gap-2 border-b-2 border-dotted border-gray-400 pb-1 font-body text-xs md:text-sm">
                    <span className="shrink-0">در وجه:</span>
                     <span className="font-handwriting font-bold text-sm md:text-base">{payeeName}</span>
                    <span className="shrink-0 ml-4">هزینه برای:</span>
                     <span className="font-handwriting font-bold text-sm md:text-base flex-grow">
                       {expenseForName}
                    </span>
                </div>
                 <div className="flex-grow"></div>
                <div className="flex justify-between items-end pt-4">
                    <div className="text-left">
                        <p className="font-handwriting font-bold text-lg md:text-xl">{formatCurrency(check.amount, 'IRT')}</p>
                    </div>
                     <div className="text-center">
                        <span className="text-xs text-muted-foreground font-body">دسته‌بندی</span>
                        <p className="font-handwriting font-bold text-sm md:text-base">{categoryName}</p>
                    </div>
                    <div className="text-right relative">
                        <span className="text-xs text-muted-foreground font-body">صاحب حساب:</span>
                        <p className="font-body text-xs sm:text-sm font-semibold h-6">{ownerName}</p>
                        {signatureImage && (
                            <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-left-4 w-24 h-12 md:w-28 md:h-14 pointer-events-none">
                                <Image 
                                    src={signatureImage} 
                                    alt={`امضای ${ownerName}`} 
                                    width={112} 
                                    height={56}
                                    style={{ objectFit: 'contain'}}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
