'use client';

import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp, addDoc, query, where, getDocs } from 'firebase/firestore';
import type { BankAccount, Transfer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { TransferForm } from '@/components/transfers/transfer-form';

export default function TransfersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

 const [allBankAccounts, setAllBankAccounts] = React.useState<BankAccount[]>([]);
  const [isLoadingAllBankAccounts, setIsLoadingAllBankAccounts] = React.useState(true);
  
  React.useEffect(() => {
    if (!firestore || !user) return;
    const fetchAllAccounts = async () => {
        setIsLoadingAllBankAccounts(true);
        const personalAccounts: BankAccount[] = [];
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        for (const userDoc of usersSnapshot.docs) {
            const accountsSnapshot = await getDocs(collection(firestore, 'users', userDoc.id, 'bankAccounts'));
            accountsSnapshot.forEach(doc => {
                personalAccounts.push({ ...doc.data(), id: doc.id, userId: userDoc.id } as BankAccount);
            });
        }
        
        const sharedAccountsQuery = query(collection(firestore, 'shared', 'data', 'bankAccounts'), where(`members.${user.uid}`, '==', true));
        const sharedAccountsSnapshot = await getDocs(sharedAccountsQuery);
        const sharedAccounts = sharedAccountsSnapshot.docs.map(doc => ({...doc.data(), id: `shared-${doc.id}`, isShared: true}) as BankAccount);

        setAllBankAccounts([...personalAccounts, ...sharedAccounts]);
        setIsLoadingAllBankAccounts(false);
    }
    fetchAllAccounts();
  },[firestore, user]);


  const handleTransferSubmit = async (values: Omit<Transfer, 'id' | 'userId' | 'transferDate'>) => {
    if (!user || !firestore) return;

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
        
        const getCardRef = (bankAccountId: string) => {
            const isShared = bankAccountId.startsWith('shared-');
            const accountId = isShared ? bankAccountId.replace('shared-', '') : bankAccountId;
            let ownerId = '';
            if (isShared) {
                ownerId = user.uid; // Not strictly correct but works for path construction
            } else {
                const account = allBankAccounts.find(acc => acc.id === accountId);
                if (!account) throw new Error(`کارت با شناسه ${accountId} یافت نشد`);
                ownerId = account.userId;
            }
            return doc(firestore, isShared ? `shared/data/bankAccounts/${accountId}` : `users/${ownerId}/bankAccounts/${accountId}`);
        };
        
        const fromCardRef = getCardRef(values.fromBankAccountId);
        const toCardRef = getCardRef(values.toBankAccountId);

        const fromCardDoc = await transaction.get(fromCardRef);
        const toCardDoc = await transaction.get(toCardRef);

        if (!fromCardDoc.exists() || !toCardDoc.exists()) {
          throw new Error("یک یا هر دو حساب بانکی یافت نشدند.");
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
        
        // Create a record of the transfer in the current user's collection
        const transferRef = doc(collection(firestore, 'users', user.uid, 'transfers'));
        transaction.set(transferRef, {
            ...values,
            id: transferRef.id,
            userId: user.uid,
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
  };

  const isLoading = isUserLoading || isLoadingAllBankAccounts;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          انتقال داخلی بین حساب‌ها
        </h1>
      </div>
      
      <p className="text-muted-foreground">
        از این بخش برای جابجایی پول بین حساب‌های خود استفاده کنید. این عملیات به عنوان درآمد یا هزینه در گزارش‌ها ثبت نمی‌شود.
      </p>

      {isLoading ? (
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <TransferForm
            bankAccounts={allBankAccounts}
            onSubmit={handleTransferSubmit}
            user={user}
          />
        </div>
      )}
    </main>
  );
}
