'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { IncomeList } from '@/components/income/income-list';
import { IncomeForm } from '@/components/income/income-form';
import type { Income, BankAccount, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function IncomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);

  const [allIncomes, setAllIncomes] = React.useState<Income[]>([]);
  const [allBankAccounts, setAllBankAccounts] = React.useState<BankAccount[]>([]);
  const [allUsers, setAllUsers] = React.useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);


  React.useEffect(() => {
    if (!user || !firestore) return;
    
    const fetchData = async () => {
      setIsLoadingData(true);
      
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const userProfiles = usersSnapshot.docs.map(doc => ({...doc.data(), id: doc.id } as UserProfile));
      const userIds = userProfiles.map(u => u.id);
      setAllUsers(userProfiles);

      const incomePromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'incomes')));
      const bankAccountPromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'bankAccounts')));
      
      const [incomeSnapshots, bankAccountSnapshots] = await Promise.all([
        Promise.all(incomePromises),
        Promise.all(bankAccountPromises)
      ]);

      const incomes = incomeSnapshots.flat().map(snap => snap.docs.map(doc => ({...doc.data(), id: doc.id} as Income))).flat();
      const personalBankAccounts = bankAccountSnapshots.flat().map((snap, index) => snap.docs.map(doc => ({...doc.data(), id: doc.id, userId: userIds[index]} as BankAccount))).flat();

      const sharedAccountsQuery = user.uid ? query(collection(firestore, 'shared', 'data', 'bankAccounts'), where(`members.${user.uid}`, '==', true)) : null;
      const sharedAccountsSnapshot = sharedAccountsQuery ? await getDocs(sharedAccountsQuery) : null;
      const sharedBankAccounts = sharedAccountsSnapshot ? sharedAccountsSnapshot.docs.map(doc => ({...doc.data(), id: `shared-${doc.id}`, isShared: true}) as BankAccount) : [];

      setAllIncomes(incomes);
      setAllBankAccounts([...personalBankAccounts, ...sharedBankAccounts]);
      setIsLoadingData(false);
    };

    fetchData();
  }, [user, firestore]);



  const handleFormSubmit = async (values: Omit<Income, 'id' | 'userId' | 'createdAt' | 'registeredByUserId'>) => {
    if (!user || !firestore) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const isSharedAccount = values.bankAccountId.startsWith('shared-');
        const accountId = isSharedAccount ? values.bankAccountId.replace('shared-','') : values.bankAccountId;
        
        let ownerId = '';
        if(isSharedAccount){
           ownerId = user.uid; // Not really an owner, but needed for path
        } else {
             const account = allBankAccounts.find(acc => acc.id === accountId);
             if(!account) throw new Error("کارت بانکی یافت نشد");
             ownerId = account.userId;
        }

        const targetCardRef = doc(firestore, isSharedAccount ? `shared/data/bankAccounts/${accountId}` : `users/${ownerId}/bankAccounts/${accountId}`);
        const targetCardDoc = await transaction.get(targetCardRef);
        
        if (!targetCardDoc.exists()) {
          throw new Error("کارت بانکی مورد نظر یافت نشد.");
        }
        const targetCardData = targetCardDoc.data() as BankAccount;

        if (editingIncome) {
          // --- Edit Mode ---
          const oldIncomeRef = doc(firestore, 'users', editingIncome.userId, 'incomes', editingIncome.id);
          const isOldShared = editingIncome.bankAccountId.startsWith('shared-');
          const oldAccountId = isOldShared ? editingIncome.bankAccountId.replace('shared-', '') : editingIncome.bankAccountId;
          
          let oldOwnerId = '';
          if(isOldShared) {
            oldOwnerId = user.uid;
          } else {
            const oldAccount = allBankAccounts.find(acc => acc.id === oldAccountId);
            if(!oldAccount) throw new Error("کارت بانکی قدیمی یافت نشد.");
            oldOwnerId = oldAccount.userId;
          }

          const oldCardRef = doc(firestore, isOldShared ? `shared/data/bankAccounts/${oldAccountId}` : `users/${oldOwnerId}/bankAccounts/${oldAccountId}`);
          
          // 1. Revert previous transaction
          const oldCardDoc = await transaction.get(oldCardRef);
          if (oldCardDoc.exists()) {
              const oldCardData = oldCardDoc.data() as BankAccount;
              transaction.update(oldCardRef, { balance: oldCardData.balance - editingIncome.amount });
          }

          // 2. Apply new transaction
          transaction.update(targetCardRef, { balance: targetCardData.balance + values.amount });

          // 3. Update income document
          transaction.update(oldIncomeRef, { ...values, registeredByUserId: user.uid, updatedAt: serverTimestamp() });
          toast({ title: "موفقیت", description: "درآمد با موفقیت ویرایش شد." });

        } else {
          // --- Create Mode ---
          // 1. Increase balance
          transaction.update(targetCardRef, { balance: targetCardData.balance + values.amount });

          // 2. Create new income document in the bank account owner's collection
          const incomeOwnerId = ownerId; // Income belongs to the account owner
          const newIncomeRef = doc(collection(firestore, 'users', incomeOwnerId, 'incomes'));
          transaction.set(newIncomeRef, {
            ...values,
            id: newIncomeRef.id,
            userId: incomeOwnerId,
            registeredByUserId: user.uid, // The user who is currently logged in and performing the action
            createdAt: serverTimestamp(),
          });
          toast({ title: "موفقیت", description: "درآمد جدید با موفقیت ثبت شد." });
        }
      });
      
      setEditingIncome(null);
      setIsFormOpen(false);

    } catch (error: any) {
      console.error("خطا در ثبت تراکنش:", error);
      toast({
        variant: "destructive",
        title: "خطا در ثبت درآمد",
        description: error.message || "مشکلی در ثبت اطلاعات پیش آمد. لطفا دوباره تلاش کنید.",
      });
    }
  };

  const handleDelete = async (income: Income) => {
    if (!user || !firestore || !allIncomes) return;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const incomeRef = doc(firestore, 'users', income.userId, 'incomes', income.id);
            
            const isShared = income.bankAccountId.startsWith('shared-');
            const accountId = isShared ? income.bankAccountId.replace('shared-', '') : income.bankAccountId;
            
            let ownerId = '';
            if(isShared) {
                ownerId = user.uid;
            } else {
                const account = allBankAccounts.find(acc => acc.id === accountId);
                if(!account) throw new Error("کارت بانکی یافت نشد");
                ownerId = account.userId;
            }

            const cardRef = doc(firestore, isShared ? `shared/data/bankAccounts/${accountId}` : `users/${ownerId}/bankAccounts/${accountId}`);

            const cardDoc = await transaction.get(cardRef);
            if (cardDoc.exists()) {
                const cardData = cardDoc.data() as BankAccount;
                // Deduct income amount from balance on delete
                transaction.update(cardRef, { balance: cardData.balance - income.amount });
            }
            
            transaction.delete(incomeRef);
        });
        toast({ title: "موفقیت", description: "درآمد با موفقیت حذف شد." });
    } catch (error: any) {
        console.error("خطا در حذف درآمد:", error);
        toast({
            variant: "destructive",
            title: "خطا در حذف درآمد",
            description: error.message || "مشکلی در حذف اطلاعات پیش آمد.",
        });
    }
  };


  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingIncome(null);
    setIsFormOpen(true);
  };

  const isLoading = isUserLoading || isLoadingData;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مدیریت درآمدها
        </h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          ثبت درآمد جدید
        </Button>
      </div>

      {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : isFormOpen ? (
        <IncomeForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingIncome}
          bankAccounts={allBankAccounts}
          user={user}
        />
      ) : (
        <IncomeList
          incomes={allIncomes || []}
          bankAccounts={allBankAccounts || []}
          users={allUsers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
