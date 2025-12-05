
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { formatCurrency, formatJalaliDate, cn, amountToWords } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { USER_DETAILS } from '@/lib/constants';
import { SignatureAli, SignatureFatemeh, HesabKetabLogo } from '@/components/icons';

function CheckDetailSkeleton() {
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-56 w-full max-w-2xl mx-auto" />
      <Skeleton className="h-24 w-full max-w-2xl mx-auto" />
    </main>
  );
}

export default function CheckDetailPage() {
  const router = useRouter();
  const params = useParams();
  const checkId = params.checkId as string;

  const { isLoading, allData } = useDashboardData();
  const { checks, bankAccounts, payees, categories } = allData;

  const { check } = useMemo(() => {
    if (isLoading || !checkId) {
      return { check: null };
    }
    const currentCheck = checks.find((c) => c.id === checkId);
    return { check: currentCheck };
  }, [isLoading, checkId, checks]);

  if (isLoading) {
    return <CheckDetailSkeleton />;
  }

  if (!check) {
    return (
      <main className="flex-1 p-4 pt-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>چک یافت نشد</CardTitle>
          </CardHeader>
          <CardContent>
            <p>متاسفانه چکی با این مشخصات در سیستم وجود ندارد.</p>
            <Button onClick={() => router.push('/checks')} className="mt-4">
              بازگشت به لیست چک‌ها
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const getPayeeName = (payeeId?: string) => {
    if (!payeeId) return 'نامشخص';
    return payees.find(p => p.id === payeeId)?.name || 'نامشخص';
  };
  
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'نامشخص';
    return categories.find(c => c.id === categoryId)?.name || 'نامشخص';
  }

  const getBankAccount = (bankAccountId?: string) => {
    if (!bankAccountId) return null;
    return bankAccounts.find(b => b.id === bankAccountId);
  }

  const getOwnerDetails = (ownerId: 'ali' | 'fatemeh' | 'shared_account') => {
    if (ownerId === 'shared_account') return { name: "علی کاکایی و فاطمه صالح" };
    const userDetail = USER_DETAILS[ownerId];
    if (!userDetail) return { name: "ناشناس" };
    return { name: `${userDetail.firstName} ${userDetail.lastName}`};
  };
  
  const bankAccount = getBankAccount(check.bankAccountId);
  const { name: ownerName } = getOwnerDetails(check.liabilityOwnerId);
  const expenseForName = check.expenseFor && USER_DETAILS[check.expenseFor] ? USER_DETAILS[check.expenseFor].firstName : 'مشترک';
  const isCleared = check.status === 'cleared';

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            جزئیات چک
          </h1>
          <div className="text-muted-foreground flex items-center gap-2">
            <span>{check.description || `چک به ${getPayeeName(check.payeeId)}`}</span>
            {isCleared ? 
                <Badge className="bg-emerald-500 text-white">پاس شده</Badge> : 
                <Badge variant="destructive">در انتظار پاس</Badge>
            }
          </div>
        </div>
        <Button onClick={() => router.push('/checks')} variant="outline">
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به لیست
        </Button>
      </div>

       <div className="max-w-2xl mx-auto">
         <Card className={cn("overflow-hidden shadow-2xl h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-2 border-gray-300 dark:border-gray-700", isCleared && "opacity-60")}>
            {isCleared && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform rotate-[-15deg] border-4 border-emerald-500 text-emerald-500 rounded-lg p-2 text-4xl font-black uppercase opacity-60 select-none z-20">
                    پاس شد
                </div>
            )}
            
            {/* Header */}
            <div className="p-3 relative bg-gray-100 dark:bg-gray-800/50 flex justify-between items-start">
                <div className="text-left w-1/3">
                    <p className="text-[10px] text-muted-foreground font-sans">شناسه صیاد: <span className="font-mono font-bold tracking-wider text-foreground">{check.sayadId}</span></p>
                    <p className="text-[10px] text-muted-foreground font-sans">سریال چک: <span className="font-mono font-bold tracking-tight text-foreground">{check.checkSerialNumber}</span></p>
                </div>

                <div className="text-center w-1/3">
                    <HesabKetabLogo className="w-6 h-6 mx-auto text-primary/70" />
                    <p className="font-bold text-sm">{bankAccount?.bankName}</p>
                </div>
                
                <div className="text-right w-1/3">
                     <p className="text-xs text-muted-foreground font-sans">تاریخ:</p>
                     <p className="font-handwriting font-bold text-lg">{formatJalaliDate(new Date(check.dueDate))}</p>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-2 flex-grow flex flex-col text-sm">
                <div className="flex items-center gap-2 border-b-2 border-dotted border-gray-400 pb-1">
                    <span className="font-body shrink-0">به موجب این چک مبلغ</span>
                    <span className="font-handwriting font-bold text-base text-center flex-grow px-1">
                        {amountToWords(check.amount)}
                    </span>
                    <span className="font-body shrink-0">تومان</span>
                </div>
                <div className="flex items-center gap-2 border-b-2 border-dotted border-gray-400 pb-1">
                    <span className="font-body shrink-0">در وجه:</span>
                    <span className="font-handwriting font-bold text-base">{getPayeeName(check.payeeId)}</span>
                    <span className="font-body ml-auto">برای:</span>
                    <span className="font-handwriting font-bold text-base">{expenseForName}</span>
                </div>
                <div className="flex-grow"></div>
                <div className="flex justify-between items-end pt-4">
                     <div className="text-left">
                        <span className="text-xs text-muted-foreground">مبلغ</span>
                        <p className="font-handwriting font-bold text-xl">{formatCurrency(check.amount, 'IRT')}</p>
                    </div>
                    <div className="text-right relative">
                        <span className="text-xs text-muted-foreground">دسته‌بندی</span>
                        <p className="font-handwriting font-bold text-base">{getCategoryName(check.categoryId)}</p>
                    </div>
                    <div className="text-right relative">
                        <span className="text-xs text-muted-foreground">صاحب حساب</span>
                        <p className="font-body text-sm font-semibold">{ownerName}</p>
                        <div className="absolute -bottom-5 right-0 w-24 h-12 pointer-events-none opacity-80">
                            {check.liabilityOwnerId === 'ali' && <SignatureAli className="w-full h-full text-gray-700 dark:text-gray-300" />}
                            {check.liabilityOwnerId === 'fatemeh' && <SignatureFatemeh className="w-full h-full text-gray-700 dark:text-gray-300" />}
                            {check.liabilityOwnerId === 'shared_account' && (
                                <>
                                    <SignatureAli className="w-20 h-10 absolute -top-2 right-4 text-gray-700 dark:text-gray-300" />
                                    <SignatureFatemeh className="w-20 h-10 absolute -top-2 left-[-20px] text-gray-700 dark:text-gray-300" />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
      </div>
    </main>
  );
}
