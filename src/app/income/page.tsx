'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { IncomeList } from '@/components/income/income-list';
import { IncomeForm } from '@/components/income/income-form';
import type { Income, BankAccount } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function IncomePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);

  const incomesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'incomes') : null),
    [firestore, user]
  );
  const { data: incomes, isLoading: isLoadingIncomes } = useCollection<Income>(incomesQuery);

  const bankAccountsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'bankAccounts')) : null),
    [firestore, user]
  );
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
  
  // Fetch all user accounts to display owner names correctly
  const allUsersBankAccountsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: allUsers, isLoading: isLoadingAllUsers } = useCollection(allUsersBankAccountsQuery);

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



  const handleFormSubmit = async (values: Omit<Income, 'id' | 'userId' | 'createdAt'>) => {
    if (!user || !firestore) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const isSharedAccount = values.bankAccountId.startsWith('shared-');
        const accountId = isSharedAccount ? values.bankAccountId.replace('shared-','') : values.bankAccountId;
        
        // Find the owner of the bank account
        let ownerId = '';
        if(isSharedAccount){
           // For shared accounts, we don't need a specific owner, or we could assign it to the current user
           ownerId = user.uid;
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
          // --- حالت ویرایش ---
          const oldIncomeRef = doc(firestore, 'users', user.uid, 'incomes', editingIncome.id);
          const isOldShared = editingIncome.bankAccountId.startsWith('shared-');
          const oldAccountId = isOldShared ? editingIncome.bankAccountId.replace('shared-', '') : editingIncome.bankAccountId;
          
          let oldOwnerId = '';
          if(isOldShared) {
            oldOwnerId = user.uid; // Assuming current user had access
          } else {
            const oldAccount = allBankAccounts.find(acc => acc.id === oldAccountId);
            if(!oldAccount) throw new Error("کارت بانکی قدیمی یافت نشد.");
            oldOwnerId = oldAccount.userId;
          }

          const oldCardRef = doc(firestore, isOldShared ? `shared/data/bankAccounts/${oldAccountId}` : `users/${oldOwnerId}/bankAccounts/${oldAccountId}`);
          
          // 1. خنثی‌سازی تراکنش قبلی
          const oldCardDoc = await transaction.get(oldCardRef);
          if (oldCardDoc.exists()) {
              const oldCardData = oldCardDoc.data() as BankAccount;
              transaction.update(oldCardRef, { balance: oldCardData.balance - editingIncome.amount });
          }

          // 2. اعمال تراکنش جدید
          transaction.update(targetCardRef, { balance: targetCardData.balance + values.amount });

          // 3. به‌روزرسانی سند درآمد
          transaction.update(oldIncomeRef, { ...values, updatedAt: serverTimestamp() });
          toast({ title: "موفقیت", description: "درآمد با موفقیت ویرایش شد." });

        } else {
          // --- حالت ثبت جدید ---
          // 1. افزایش موجودی
          transaction.update(targetCardRef, { balance: targetCardData.balance + values.amount });

          // 2. ایجاد سند درآمد جدید در کالکشن کاربر فعلی
          const newIncomeRef = doc(collection(firestore, 'users', user.uid, 'incomes'));
          transaction.set(newIncomeRef, {
            ...values,
            id: newIncomeRef.id,
            userId: user.uid, // The income document belongs to the user who created it
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

  const handleDelete = async (incomeId: string) => {
    if (!user || !firestore || !incomes) return;

    const incomeToDelete = incomes.find(inc => inc.id === incomeId);
    if (!incomeToDelete) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const incomeRef = doc(firestore, 'users', user.uid, 'incomes', incomeId);
            
            const isShared = incomeToDelete.bankAccountId.startsWith('shared-');
            const accountId = isShared ? incomeToDelete.bankAccountId.replace('shared-', '') : incomeToDelete.bankAccountId;
            
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
                // کسر مبلغ درآمد از موجودی هنگام حذف
                transaction.update(cardRef, { balance: cardData.balance - incomeToDelete.amount });
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

  const isLoading = isUserLoading || isLoadingIncomes || isLoadingAllBankAccounts;

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
          incomes={incomes || []}
          bankAccounts={allBankAccounts || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
