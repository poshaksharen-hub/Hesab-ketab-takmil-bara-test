
'use client';

import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp, addDoc, query, where, getDocs } from 'firebase/firestore';
import type { BankAccount, Transfer, UserProfile, OwnerId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { TransferForm } from '@/components/transfers/transfer-form';
import { TransferList } from '@/components/transfers/transfer-list';
import { useDashboardData } from '@/hooks/use-dashboard-data';

const FAMILY_DATA_DOC = 'shared-data';

export default function TransfersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();
  
  const { bankAccounts: allBankAccounts, users: allUsers, transfers } = allData;


  const handleTransferSubmit = React.useCallback(async (values: Omit<Transfer, 'id' | 'registeredByUserId' | 'transferDate'>) => {
    if (!user || !firestore || !allBankAccounts) return;

    if (values.fromBankAccountId === values.toBankAccountId) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "حساب مبدا و مقصد نمی‌توانند یکسان باشند.",
      });
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        
        const fromAccount = allBankAccounts.find(acc => acc.id === values.fromBankAccountId);
        const toAccount = allBankAccounts.find(acc => acc.id === values.toBankAccountId);

        if (!fromAccount || !toAccount) {
            throw new Error("یک یا هر دو حساب بانکی یافت نشدند.");
        }

        const fromCardRef = doc(firestore, `family-data/${FAMILY_DATA_DOC}/bankAccounts`, fromAccount.id);
        const toCardRef = doc(firestore, `family-data/${FAMILY_DATA_DOC}/bankAccounts`, toAccount.id);

        const fromCardDoc = await transaction.get(fromCardRef);
        const toCardDoc = await transaction.get(toCardRef);

        if (!fromCardDoc.exists() || !toCardDoc.exists()) {
          throw new Error("یک یا هر دو سند حساب بانکی در پایگاه داده یافت نشدند.");
        }

        const fromCardData = fromCardDoc.data() as BankAccount;
        const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);

        if (availableBalance < values.amount) {
          throw new Error("موجودی قابل استفاده حساب مبدا برای این انتقال کافی نیست.");
        }

        // Deduct from source account
        transaction.update(fromCardRef, { balance: fromCardData.balance - values.amount });

        // Add to destination account
        const toCardData = toCardDoc.data() as BankAccount;
        transaction.update(toCardRef, { balance: toCardData.balance + values.amount });
        
        // Create a record of the transfer in the central collection
        const transferRef = doc(collection(firestore, `family-data/${FAMILY_DATA_DOC}/transfers`));
        transaction.set(transferRef, {
            ...values,
            id: transferRef.id,
            registeredByUserId: user.uid,
            transferDate: new Date().toISOString(),
        });

      });
      
      toast({
        title: "موفقیت",
        description: "انتقال وجه با موفقیت انجام شد.",
      });

    } catch (error: any) {
      console.error("خطا در انتقال وجه:", error);
      toast({
        variant: "destructive",
        title: "خطا در انتقال وجه",
        description: error.message || "مشکلی در انجام عملیات پیش آمد. لطفا دوباره تلاش کنید.",
      });
    }
  }, [user, firestore, allBankAccounts, toast]);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          انتقال داخلی بین حساب‌ها
        </h1>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
            <p className="text-muted-foreground mb-4">
                از این بخش برای جابجایی پول بین حساب‌های خود استفاده کنید. این عملیات به عنوان درآمد یا هزینه در گزارش‌ها ثبت نمی‌شود.
            </p>
            {isLoading ? (
                <Skeleton className="h-96 w-full" />
            ) : (
                <TransferForm
                    bankAccounts={allBankAccounts}
                    onSubmit={handleTransferSubmit}
                    user={user}
                    users={allUsers}
                />
            )}
        </div>
        <div className="lg:col-span-3">
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : (
                <TransferList 
                    transfers={transfers || []}
                    bankAccounts={allBankAccounts}
                />
            )}
        </div>
      </div>
    </main>
  );
}
