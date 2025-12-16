
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { IncomeList } from '@/components/income/income-list';
import { IncomeForm } from '@/components/income/income-form';
import type { Income, BankAccount, UserProfile, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { errorEmitter } from '@/firebase/error-emitter';

const FAMILY_DATA_DOC = 'shared-data';

export default function IncomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const { incomes: allIncomes, bankAccounts: allBankAccounts, users } = allData;

  const handleFormSubmit = React.useCallback(async (values: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'registeredByUserId' | 'type' | 'category'>) => {
    if (!user || !firestore || !allBankAccounts || !users) return;
    
    const isoDate = (values.date as Date).toISOString();

    try {
      await runTransaction(firestore, async (transaction) => {
          const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
          const newIncomeRef = doc(collection(familyDataRef, 'incomes'));

          const account = allBankAccounts.find(acc => acc.id === values.bankAccountId);
          if (!account) throw new Error("کارت بانکی یافت نشد");
    
          const targetCardRef = doc(familyDataRef, 'bankAccounts', account.id);
          const targetCardDoc = await transaction.get(targetCardRef);
    
          if (!targetCardDoc.exists()) {
            throw new Error("کارت بانکی مورد نظر یافت نشد.");
          }
          const targetCardData = targetCardDoc.data()!;
          
          const balanceBefore = targetCardData.balance;
          const balanceAfter = balanceBefore + values.amount;
    
          transaction.update(targetCardRef, { balance: balanceAfter });
          
          const newIncomeData: Omit<Income, 'id'> = {
              ...values,
              date: isoDate,
              type: 'income',
              category: 'درآمد',
              registeredByUserId: user.uid,
              createdAt: serverTimestamp(),
              balanceAfter: balanceAfter,
          };
          transaction.set(newIncomeRef, {...newIncomeData, id: newIncomeRef.id});
        });

        setIsFormOpen(false);
        toast({ title: "موفقیت", description: "درآمد جدید با موفقیت ثبت شد." });
    
        try {
            const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
            const bankAccount = allBankAccounts.find(b => b.id === values.bankAccountId);
            const bankAccountOwnerName = bankAccount?.ownerId === 'shared_account' ? 'مشترک' : (bankAccount?.ownerId && USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh']?.firstName);
            
            const notificationDetails: TransactionDetails = {
                type: 'income',
                title: `ثبت درآمد جدید: ${values.description}`,
                amount: values.amount,
                date: isoDate, // Use the ISO string
                icon: 'TrendingUp',
                color: 'rgb(34 197 94)',
                registeredBy: currentUserFirstName,
                payee: values.source,
                category: values.ownerId === 'daramad_moshtarak' ? 'شغل مشترک' : `درآمد ${USER_DETAILS[values.ownerId as 'ali' | 'fatemeh']?.firstName}`,
                bankAccount: bankAccount ? { name: bankAccount.bankName, owner: bankAccountOwnerName || 'نامشخص' } : undefined,
            };
            await sendSystemNotification(firestore, user.uid, notificationDetails, currentUserFirstName);
        } catch (notificationError) {
             console.error("Failed to send notification:", notificationError);
             toast({
                variant: "destructive",
                title: "خطا در ارسال اعلان",
                description: "درآمد با موفقیت ثبت شد اما در ارسال اعلان آن مشکلی پیش آمد.",
             });
        }
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({
                path: 'family-data/shared-data/incomes',
                operation: 'write',
                requestResourceData: values,
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در ثبت درآمد",
            description: error.message || "مشکلی در ثبت اطلاعات پیش آمد. لطفا دوباره تلاش کنید.",
          });
        }
      }
  }, [user, firestore, allBankAccounts, users, toast]);

  const handleDelete = React.useCallback(async (incomeId: string) => {
    if (!firestore || !allIncomes) return;
    
    const incomeToDelete = allIncomes.find(inc => inc.id === incomeId);
    if (!incomeToDelete) {
        toast({ variant: "destructive", title: "خطا", description: "تراکنش درآمد مورد نظر یافت نشد." });
        return;
    }
    
    const incomeRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'incomes', incomeId);

    runTransaction(firestore, async (transaction) => {
        const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
        const accountRef = doc(familyDataRef, 'bankAccounts', incomeToDelete.bankAccountId);

        const accountDoc = await transaction.get(accountRef);
        if (!accountDoc.exists()) throw new Error("حساب بانکی مرتبط با این درآمد یافت نشد.");

        const accountData = accountDoc.data()!;
        transaction.update(accountRef, { balance: accountData.balance - incomeToDelete.amount });

        transaction.delete(incomeRef);
    })
    .then(() => {
        toast({ title: "موفقیت", description: "تراکنش درآمد با موفقیت حذف و مبلغ آن از حساب کسر شد." });
    })
    .catch((error: any) => {
         if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({
                path: incomeRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در حذف درآمد",
            description: error.message || "مشکلی در حذف تراکنش پیش آمد.",
          });
        }
    });
  }, [firestore, allIncomes, toast]);

  const handleAddNew = React.useCallback(() => {
    setIsFormOpen(true);
  }, []);
  
  const handleCancelForm = React.useCallback(() => {
    setIsFormOpen(false);
  }, []);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" passHref>
            <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            مدیریت درآمدها
          </h1>
        </div>
        {!isFormOpen && (
            <div className="hidden md:block">
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    ثبت درآمد جدید
                </Button>
            </div>
        )}
      </div>

       <IncomeForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={null}
          bankAccounts={allBankAccounts || []}
          user={user}
        />

      {isLoading ? (
          <div className="space-y-4 mt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : (
        <IncomeList
          incomes={allIncomes || []}
          bankAccounts={allBankAccounts || []}
          users={users || []}
          onDelete={handleDelete}
        />
      )}

      {!isFormOpen && (
          <div className="md:hidden fixed bottom-20 right-4 z-50">
              <Button
                onClick={handleAddNew}
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg"
                aria-label="ثبت درآمد جدید"
              >
                <Plus className="h-6 w-6" />
              </Button>
          </div>
      )}
    </div>
  );
}
