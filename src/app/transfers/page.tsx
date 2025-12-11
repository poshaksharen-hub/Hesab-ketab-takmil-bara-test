
'use client';

import React, { useCallback, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { BankAccount, Transfer, UserProfile, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { TransferForm } from '@/components/transfers/transfer-form';
import { TransferList } from '@/components/transfers/transfer-list';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { USER_DETAILS } from '@/lib/constants';
import { ArrowRight, PlusCircle, Plus } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';

const FAMILY_DATA_DOC = 'shared-data';

export default function TransfersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { bankAccounts: allBankAccounts, users, transfers } = allData;

  const handleTransferSubmit = useCallback(async (values: Omit<Transfer, 'id' | 'registeredByUserId' | 'transferDate' | 'fromAccountBalanceBefore' | 'fromAccountBalanceAfter' | 'toAccountBalanceBefore' | 'toAccountBalanceAfter'>) => {
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

        transaction.update(fromCardRef, { balance: fromBalanceAfter });
        transaction.update(toCardRef, { balance: toBalanceAfter });
        
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
      
      setIsFormOpen(false);
      toast({
        title: "موفقیت",
        description: "انتقال وجه با موفقیت انجام شد.",
      });
      
      const currentUser = users.find(u => u.id === user.uid);
      const fromAccount = allBankAccounts.find(b => b.id === values.fromBankAccountId);
      const toAccount = allBankAccounts.find(b => b.id === values.toBankAccountId);
      const fromAccountOwner = fromAccount?.ownerId === 'shared_account' ? 'مشترک' : USER_DETAILS[fromAccount?.ownerId as 'ali' | 'fatemeh']?.firstName;
      const toAccountOwner = toAccount?.ownerId === 'shared_account' ? 'مشترک' : USER_DETAILS[toAccount?.ownerId as 'ali' | 'fatemeh']?.firstName;
      
      const notificationDetails: TransactionDetails = {
            type: 'transfer',
            title: `انتقال داخلی`,
            amount: values.amount,
            date: new Date().toISOString(),
            icon: 'ArrowRightLeft',
            color: 'rgb(59 130 246)',
            registeredBy: currentUser?.firstName || 'کاربر',
            bankAccount: fromAccount ? { name: fromAccount.bankName, owner: fromAccountOwner || 'نامشخص' } : undefined,
            toBankAccount: toAccount ? { name: toAccount.bankName, owner: toAccountOwner || 'نامشخص' } : undefined,
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);

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
            
            transaction.update(fromAccountRef, { balance: fromAccountData.balance + transferToDelete.amount });
            transaction.update(toAccountRef, { balance: toAccountData.balance - transferToDelete.amount });

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

  const handleAddNew = useCallback(() => {
    setIsFormOpen(true);
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
            انتقال داخلی
            </h1>
        </div>
        <div className="hidden md:block">
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                ثبت انتقال جدید
            </Button>
        </div>
      </div>

      {isFormOpen && (
          <TransferForm
            bankAccounts={allBankAccounts || []}
            onSubmit={handleTransferSubmit}
            user={user}
        />
      )}

      <p className="text-muted-foreground text-sm">
          از این بخش برای جابجایی پول بین حساب‌های خود استفاده کنید. این عملیات به عنوان درآمد یا هزینه در گزارش‌ها ثبت نمی‌شود.
      </p>

      {isLoading ? (
          <div className="space-y-4 mt-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
          </div>
      ) : !isFormOpen && (
          <TransferList 
              transfers={transfers || []}
              bankAccounts={allBankAccounts || []}
              onDelete={handleDeleteTransfer}
          />
      )}
      
      {/* Floating Action Button for Mobile */}
      {!isFormOpen && (
        <div className="md:hidden fixed bottom-20 right-4 z-50">
            <Button
              onClick={handleAddNew}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg"
              aria-label="ثبت انتقال جدید"
            >
              <Plus className="h-6 w-6" />
            </Button>
        </div>
      )}
    </div>
  );
}
