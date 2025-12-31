
'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, User, Users, Calendar, PenSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency, formatJalaliDate, cn, amountToWords } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { USER_DETAILS } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { supabase } from '@/lib/supabase-client';
import type { Check } from '@/lib/types';
import { CheckPaper } from '@/components/checks/check-paper'; // Import the new shared component

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


export default function CheckDetailPage() {
  const router = useRouter();
  const params = useParams();
  const checkId = params.checkId as string;

  const { user } = useAuth();
  const { toast } = useToast();
  const { allData, refreshData, isLoading: isDashboardLoading } = useDashboardData();
  const { bankAccounts, payees, categories, users } = allData;
  const [check, setCheck] = useState<Check | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCheckDetails = useCallback(async () => {
    if (!checkId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cheques')
        .select('*')
        .eq('id', checkId)
        .single();
      
      if (error) throw error;
      
      const transformedData: Check = {
        id: data.id,
        sayadId: data.sayad_id,
        checkSerialNumber: data.serial_number,
        amount: data.amount,
        issueDate: data.issue_date,
        dueDate: data.due_date,
        status: data.status,
        bankAccountId: data.bank_account_id,
        payeeId: data.payee_id,
        categoryId: data.category_id,
        description: data.description,
        expenseFor: data.expense_for,
        clearedDate: data.cleared_date,
        signatureDataUrl: data.signature_data_url,
        registeredByUserId: data.registered_by_user_id,
        image_path: data.image_path,
        clearance_receipt_path: data.clearance_receipt_path,
      };
      setCheck(transformedData);

    } catch (error) {
      console.error("Failed to fetch check details:", error);
      setCheck(null);
    } finally {
      setIsLoading(false);
    }
  }, [checkId]);

  useEffect(() => {
    fetchCheckDetails();
  }, [fetchCheckDetails]);


  const handleClearCheck = useCallback(async (checkToClear: any) => {
    if (!user) return;
    try {
        const { error } = await supabase.rpc('clear_check', {
            p_check_id: checkToClear.id,
            p_user_id: user.id,
            p_clearance_receipt_path: null
        });
        if (error) throw new Error(error.message);
        await refreshData();
        await fetchCheckDetails(); // Re-fetch this specific check's details
        toast({ title: 'موفقیت!', description: `چک به مبلغ ${formatCurrency(checkToClear.amount, 'IRT')} پاس شد.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در پاس کردن چک', description: error.message });
    }
  }, [user, refreshData, toast, fetchCheckDetails]);
  
  const totalLoading = isLoading || isDashboardLoading;
  
  if (totalLoading) {
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
            <p>متاسفانه چکی با این مشخصات در سیستم وجود ندارد یا شما اجازه دسترسی به آن را ندارید.</p>
            <Button onClick={() => router.push('/checks')} className="mt-4">
              بازگشت به لیست چک‌ها
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const getPayeeName = (payeeId?: string) => payees?.find((p: any) => p.id === payeeId)?.name || 'نامشخص';
  const getCategoryName = (categoryId?: string) => categories?.find((c: any) => c.id === categoryId)?.name || 'نامشخص';
  const getBankAccount = (bankAccountId?: string) => bankAccounts?.find((b: any) => b.id === bankAccountId);
  
  const bankAccount = getBankAccount(check.bankAccountId);

  const ownerName = bankAccount?.ownerId === 'shared_account' 
        ? 'علی و فاطمه' 
        : (bankAccount?.ownerId && USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh'] 
            ? `${USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh'].firstName} ${USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh'].lastName}` 
            : 'ناشناس');

  const expenseForName = check.expenseFor && USER_DETAILS[check.expenseFor] ? USER_DETAILS[check.expenseFor].firstName : 'مشترک';
  
  const signatureImage = check.signatureDataUrl || (bankAccount?.ownerId ? (USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh']?.signatureImage) : undefined);

  const registeredByName = users?.find((u: any) => u.id === check.registeredByUserId)?.firstName || 'سیستم';

  const isCleared = check.status === 'cleared';
  const hasSufficientFunds = bankAccount ? bankAccount.balance >= check.amount : false;

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
         <CheckPaper
            check={check}
            bankAccount={bankAccount}
            payeeName={getPayeeName(check.payeeId)}
            ownerName={ownerName}
            expenseForName={expenseForName}
            categoryName={getCategoryName(check.categoryId)}
            signatureImage={signatureImage}
         />
        
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
                        <p className="font-semibold">{registeredByName}</p>
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
