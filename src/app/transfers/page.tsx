

'use client';

import React, { useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, addDoc, serverTimestamp } from 'firebase/firestore';
import type { BankAccount, Transfer, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { TransferForm } from '@/components/transfers/transfer-form';
import { TransferList } from '@/components/transfers/transfer-list';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const FAMILY_DATA_DOC = 'shared-data';

export default function TransfersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();
  
  const { bankAccounts: allBankAccounts, users: allUsers, transfers } = allData;


  const handleTransferSubmit = React.useCallback(async (values: Omit<Transfer, 'id' | 'registeredByUserId' | 'transferDate' | 'fromAccountBalanceBefore' | 'fromAccountBalanceAfter' | 'toAccountBalanceBefore' | 'toAccountBalanceAfter'>) => {
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
        
        const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
        const fromCardRef = doc(familyDataRef, 'bankAccounts', values.fromBankAccountId);
        const toCardRef = doc(familyDataRef, 'bankAccounts', values.toBankAccountId);

        const fromCardDoc = await transaction.get(fromCardRef);
        const toCardDoc = await transaction.get(toCardRef);

        if (!fromCardDoc.exists() || !toCardDoc.exists()) {
          throw new Error("یک یا هر دو حساب بانکی در پایگاه داده یافت نشدند.");
        }

        const fromCardData = fromCardDoc.data() as BankAccount;
        const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);

        if (availableBalance < values.amount) {
          throw new Error("موجودی قابل استفاده حساب مبدا برای این انتقال کافی نیست.");
        }

        const fromBalanceBefore = fromCardData.balance;
        const fromBalanceAfter = fromBalanceBefore - values.amount;
        const toCardData = toCardDoc.data() as BankAccount;
        const toBalanceBefore = toCardData.balance;
        const toBalanceAfter = toBalanceBefore + values.amount;

        // Deduct from source account
        transaction.update(fromCardRef, { balance: fromBalanceAfter });

        // Add to destination account
        transaction.update(toCardRef, { balance: toBalanceAfter });
        
        // Create a record of the transfer in the central collection
        const newTransferRef = doc(collection(familyDataRef, 'transfers'));
        transaction.set(newTransferRef, {
            ...values,
            id: newTransferRef.id,
            registeredByUserId: user.uid,
            transferDate: new Date().toISOString(),
            fromAccountBalanceBefore: fromBalanceBefore,
            fromAccountBalanceAfter: fromBalanceAfter,
            toAccountBalanceBefore: toBalanceBefore,
            toAccountBalanceAfter: toBalanceAfter,
        });

      });
      
      toast({
        title: "موفقیت",
        description: "انتقال وجه با موفقیت انجام شد.",
      });

    } catch (error: any) {
      if (error.name === 'FirebaseError') {
        const permissionError = new FirestorePermissionError({
          path: 'family-data/shared-data/transfers',
          operation: 'create',
          requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: "destructive",
          title: "خطا در انتقال وجه",
          description: error.message || "مشکلی در انجام عملیات پیش آمد. لطفا دوباره تلاش کنید.",
        });
      }
    }
  }, [user, firestore, allBankAccounts, toast]);

  const handleDeleteTransfer = useCallback(async (transferId: string) => {
    if (!firestore || !transfers) return;

    const transferToDelete = transfers.find(t => t.id === transferId);
    if (!transferToDelete) {
      toast({ variant: "destructive", title: "خطا", description: "تراکنش انتقال مورد نظر یافت نشد." });
      return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const transferRef = doc(familyDataRef, 'transfers', transferId);
            const fromAccountRef = doc(familyDataRef, 'bankAccounts', transferToDelete.fromBankAccountId);
            const toAccountRef = doc(familyDataRef, 'bankAccounts', transferToDelete.toBankAccountId);

            const fromAccountDoc = await transaction.get(fromAccountRef);
            const toAccountDoc = await transaction.get(toAccountRef);

            if (!fromAccountDoc.exists() || !toAccountDoc.exists()) {
                throw new Error("یک یا هر دو حساب بانکی مرتبط با این انتقال یافت نشدند.");
            }

            const fromAccountData = fromAccountDoc.data()!;
            const toAccountData = toAccountDoc.data()!;
            
            // Revert the financial impact
            transaction.update(fromAccountRef, { balance: fromAccountData.balance + transferToDelete.amount });
            transaction.update(toAccountRef, { balance: toAccountData.balance - transferToDelete.amount });

            // Delete the transfer record
            transaction.delete(transferRef);
        });

        toast({ title: "موفقیت", description: "تراکنش انتقال با موفقیت حذف و مبالغ به حساب‌ها بازگردانده شد." });

    } catch (error: any) {
       if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({
                path: `family-data/shared-data/transfers/${transferId}`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در حذف انتقال",
            description: error.message || "مشکلی در حذف تراکنش پیش آمد.",
          });
        }
    }

  }, [firestore, transfers, toast]);


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
                    bankAccounts={allBankAccounts || []}
                    onSubmit={handleTransferSubmit}
                    user={user}
                />
            )}
        </div>
        <div className="lg:col-span-3">
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : (
                <TransferList 
                    transfers={transfers || []}
                    bankAccounts={allBankAccounts || []}
                    users={allUsers || []}
                    onDelete={handleDeleteTransfer}
                />
            )}
        </div>
      </div>
    </main>
  );
}
