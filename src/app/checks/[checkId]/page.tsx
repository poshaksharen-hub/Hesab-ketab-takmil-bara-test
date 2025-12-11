
'use client';

import React, { useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, User, Users, Calendar, PenSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency, formatJalaliDate, cn, amountToWords } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { USER_DETAILS } from '@/lib/constants';
import { SignatureAli, SignatureFatemeh, HesabKetabLogo } from '@/components/icons';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { runTransaction, doc, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

function CheckDetailSkeleton() {
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-[28rem] w-full max-w-2xl mx-auto" />
      <Skeleton className="h-24 w-full max-w-2xl mx-auto" />
    </main>
  );
}

const getUserName = (userId: string): string => {
    if (!userId) return 'نامشخص';
    if (userId === USER_DETAILS.ali.id) return USER_DETAILS.ali.firstName;
    if (userId === USER_DETAILS.fatemeh.id) return USER_DETAILS.fatemeh.firstName;
    return 'سیستم';
};

export default function CheckDetailPage() {
  const router = useRouter();
  const params = useParams();
  const checkId = params.checkId as string;

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading, allData } = useDashboardData();
  const { checks, bankAccounts, payees, categories } = allData;

  const { check } = useMemo(() => {
    if (isLoading || !checkId) {
      return { check: null };
    }
    const currentCheck = checks.find((c) => c.id === checkId);
    return { check: currentCheck };
  }, [isLoading, checkId, checks]);

  const handleClearCheck = useCallback(async (checkToClear: typeof check) => {
    if (!user || !firestore || !checkToClear || checkToClear.status === 'cleared') return;
    
    const familyDataRef = doc(firestore, 'family-data', 'shared-data');
    const checkRef = doc(familyDataRef, 'checks', checkToClear.id);
    
    const account = bankAccounts.find(acc => acc.id === checkToClear.bankAccountId);
    if (!account) {
        toast({ variant: 'destructive', title: "خطا", description: "حساب بانکی چک یافت نشد." });
        return;
    }
    const bankAccountRef = doc(familyDataRef, 'bankAccounts', account.id);
    const expensesColRef = collection(familyDataRef, 'expenses');
    const payeeName = payees?.find(p => p.id === checkToClear.payeeId)?.name || 'نامشخص';

    try {
      await runTransaction(firestore, async (transaction) => {
        const bankAccountDoc = await transaction.get(bankAccountRef);
        if (!bankAccountDoc.exists()) throw new Error("حساب بانکی یافت نشد.");

        const bankAccountData = bankAccountDoc.data()!;
        const availableBalance = bankAccountData.balance - (bankAccountData.blockedBalance || 0);

        if (availableBalance < checkToClear.amount) {
          throw new Error("موجودی قابل استفاده حساب برای پاس کردن چک کافی نیست.");
        }

        const clearedDate = new Date().toISOString();
        const balanceBefore = bankAccountData.balance;
        const balanceAfter = balanceBefore - checkToClear.amount;

        // Update check status and cleared date
        transaction.update(checkRef, { status: 'cleared', clearedDate });
        
        // Update bank account balance
        transaction.update(bankAccountRef, { balance: balanceAfter });
        
        // Create a detailed description for the expense
        const expenseDescription = `پاس کردن چک به: ${payeeName}`


        // Create the corresponding expense
        const expenseRef = doc(expensesColRef);
        transaction.set(expenseRef, {
            id: expenseRef.id,
            ownerId: account.ownerId,
            registeredByUserId: user.uid,
            amount: checkToClear.amount,
            bankAccountId: checkToClear.bankAccountId,
            categoryId: checkToClear.categoryId,
            payeeId: checkToClear.payeeId,
            date: clearedDate,
            description: expenseDescription,
            type: 'expense',
            checkId: checkToClear.id,
            expenseFor: checkToClear.expenseFor,
            createdAt: serverTimestamp(),
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
        });
      });
      toast({ title: "موفقیت", description: "چک با موفقیت پاس شد و از حساب شما کسر گردید." });
    } catch (error: any) {
       if (error.name === 'FirebaseError') {
            throw new FirestorePermissionError({
                path: checkRef.path, // Simplified path for the transaction
                operation: 'write', 
            });
       } else {
            toast({
                variant: "destructive",
                title: "خطا در پاس کردن چک",
                description: error.message || "مشکلی در عملیات پاس کردن چک پیش آمد.",
            });
       }
    }
  }, [user, firestore, bankAccounts, payees, toast]);

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

  const getOwnerDetails = (bankAccount?: ReturnType<typeof getBankAccount>) => {
    if (!bankAccount || !bankAccount.ownerId) return { name: "نامشخص" };
    const ownerId = bankAccount.ownerId;
    if (ownerId === 'shared_account') return { name: "علی کاکایی و فاطمه صالح" };
    const userDetail = USER_DETAILS[ownerId as 'ali' | 'fatemeh'];
    return { name: userDetail ? `${userDetail.firstName} ${userDetail.lastName}` : "نامشخص" };
  };
  
  const getExpenseForName = (expenseFor?: 'ali' | 'fatemeh' | 'shared') => {
    if (!expenseFor) return 'نامشخص';
    if (expenseFor === 'shared') return 'مشترک';
    return USER_DETAILS[expenseFor]?.firstName || 'نامشخص';
  };

  const bankAccount = getBankAccount(check.bankAccountId);
  const { name: ownerName } = getOwnerDetails(bankAccount);
  const expenseForName = getExpenseForName(check.expenseFor);
  const isCleared = check.status === 'cleared';

  const hasSufficientFunds = bankAccount ? (bankAccount.balance - (bankAccount.blockedBalance || 0)) >= check.amount : false;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
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
        </div>
      </div>

       <div className="max-w-2xl mx-auto space-y-4">
         <Card className={cn("overflow-hidden shadow-2xl h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-2 border-gray-300 dark:border-gray-700", isCleared && "opacity-60")}>
            {isCleared && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-12 border-4 border-emerald-500 text-emerald-500 rounded-lg p-2 text-4xl font-black uppercase opacity-60 select-none z-20">
                    پاس شد
                </div>
            )}
            
            {/* Header */}
            <div className="p-3 relative bg-gray-100 dark:bg-gray-800/50 flex justify-between items-start">
                <div className="text-left w-1/3 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-sans">شناسه صیاد: <span className="font-mono font-bold tracking-wider text-foreground">{check.sayadId}</span></p>
                    <p className="text-[10px] text-muted-foreground font-sans">سریال چک: <span className="font-mono font-bold tracking-tight text-foreground">{check.checkSerialNumber}</span></p>
                </div>
                <div className="text-center w-1/3">
                    <HesabKetabLogo className="w-6 h-6 mx-auto text-primary/70" />
                    <p className="font-bold font-body text-sm">{bankAccount?.bankName}</p>
                </div>
                <div className="text-right w-1/3 flex flex-col items-end">
                     <p className="text-xs text-muted-foreground font-body">تاریخ سررسید:</p>
                     <p className="font-handwriting font-bold text-lg">{formatJalaliDate(new Date(check.dueDate))}</p>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-2 flex-grow flex flex-col text-sm">
                 <div className="flex items-baseline gap-2 border-b-2 border-dotted border-gray-400 pb-1 font-body">
                    <span className="shrink-0">به موجب این چک مبلغ</span>
                    <span className="font-handwriting font-bold text-base text-center flex-grow px-1">
                        {amountToWords(check.amount)}
                    </span>
                    <span className="shrink-0">تومان</span>
                 </div>
                 <div className="flex items-baseline gap-2 border-b-2 border-dotted border-gray-400 pb-1 font-body">
                    <span className="shrink-0">در وجه:</span>
                     <span className="font-handwriting font-bold text-base">{getPayeeName(check.payeeId)}</span>
                    <span className="shrink-0 ml-4">برای:</span>
                     <span className="font-handwriting font-bold text-base flex-grow">
                       {expenseForName}
                    </span>
                </div>
                 <div className="flex-grow"></div>
                <div className="flex justify-between items-end pt-4">
                    <div className="text-left">
                        <span className="text-xs text-muted-foreground font-body">مبلغ</span>
                        <p className="font-handwriting font-bold text-xl">{formatCurrency(check.amount, 'IRT')}</p>
                    </div>
                     <div className="text-center">
                        <span className="text-xs text-muted-foreground font-body">دسته‌بندی</span>
                        <p className="font-handwriting font-bold text-base">{getCategoryName(check.categoryId)}</p>
                    </div>
                    <div className="text-right relative">
                        <span className="text-xs text-muted-foreground font-body">صاحب حساب:</span>
                        <p className="font-body text-sm font-semibold">{ownerName}</p>
                        <div className="absolute -bottom-5 -right-2 w-24 h-12 pointer-events-none opacity-80">
                            {bankAccount?.ownerId === 'ali' && <SignatureAli className="w-full h-full text-gray-700 dark:text-gray-300" />}
                            {bankAccount?.ownerId === 'fatemeh' && <SignatureFatemeh className="w-full h-full text-gray-700 dark:text-gray-300" />}
                            {bankAccount?.ownerId === 'shared_account' && (
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
        
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">اطلاعات تکمیلی</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">تاریخ صدور</p>
                        <p className="font-semibold">{formatJalaliDate(new Date(check.issueDate))}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <PenSquare className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">ثبت توسط</p>
                        <p className="font-semibold">{getUserName(check.registeredByUserId)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {!isCleared && (
            <Card>
                <CardContent className="p-4 text-center">
                    {!hasSufficientFunds ? (
                        <div className="flex items-center justify-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-bold">موجودی حساب برای پاس کردن این چک کافی نیست!</span>
                        </div>
                    ) : (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button>
                                    <CheckCircle className="ml-2 h-4 w-4" />
                                    پاس کردن چک
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>آیا از پاس کردن این چک مطمئن هستید؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    با تایید این عملیات، مبلغ {formatCurrency(check.amount, 'IRT')} از حساب شما کسر و یک هزینه در سیستم ثبت خواهد شد. این عمل قابل بازگشت نیست.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleClearCheck(check)}>
                                    تایید و پاس کردن
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </CardContent>
            </Card>
        )}
      </div>
    </main>
  );
}
