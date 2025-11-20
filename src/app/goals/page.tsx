
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  runTransaction,
  writeBatch,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import type {
  FinancialGoal,
  BankAccount,
  Category,
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GoalList } from '@/components/goals/goal-list';
import { GoalForm } from '@/components/goals/goal-form';
import { AchieveGoalDialog } from '@/components/goals/achieve-goal-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const FAMILY_DATA_DOC = 'shared-data';

export default function GoalsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [achievingGoal, setAchievingGoal] = useState<FinancialGoal | null>(
    null
  );

  const goalsQuery = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'financialGoals') : null),
    [firestore, user]
  );
  const { data: goals, isLoading: isLoadingGoals } =
    useCollection<FinancialGoal>(goalsQuery);

  const bankAccountsQuery = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'bankAccounts') : null),
    [firestore, user]
  );
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } =
    useCollection<BankAccount>(bankAccountsQuery);
  
  const categoriesQuery = useMemoFirebase(
    () => (user && firestore ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'categories') : null),
    [firestore, user]
  );
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

  const handleFormSubmit = React.useCallback(async (values: any) => {
    if (!user || !firestore) return;
    const { savedAmount, savedFromBankAccountId, ...goalData } = values;

    try {
      await runTransaction(firestore, async (transaction) => {
        const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
        let originalBlockedAmount = 0;
        let originalSavedAccountId = null;

        if (editingGoal) {
          const goalRef = doc(familyDataRef, 'financialGoals', editingGoal.id);
          originalBlockedAmount = editingGoal.savedAmount || 0;
          originalSavedAccountId = editingGoal.savedFromBankAccountId;
          
          transaction.update(goalRef, {
            ...goalData,
            currentAmount: savedAmount,
            savedAmount: savedAmount,
            savedFromBankAccountId: savedFromBankAccountId,
          });

        } else {
           const newGoalRef = doc(collection(familyDataRef, 'financialGoals'));
           transaction.set(newGoalRef, {
            ...goalData,
            id: newGoalRef.id,
            registeredByUserId: user.uid,
            isAchieved: false,
            currentAmount: savedAmount,
            savedAmount: savedAmount,
            savedFromBankAccountId: savedFromBankAccountId,
          });
        }
        
        if (editingGoal && originalSavedAccountId && originalSavedAccountId !== savedFromBankAccountId) {
            const oldAccountRef = doc(familyDataRef, 'bankAccounts', originalSavedAccountId);
            const oldAccountDoc = await transaction.get(oldAccountRef);
            if(oldAccountDoc.exists()) {
                const oldAccountData = oldAccountDoc.data();
                transaction.update(oldAccountRef, { blockedBalance: (oldAccountData.blockedBalance || 0) - originalBlockedAmount });
            }
        } else if (editingGoal && originalSavedAccountId === savedFromBankAccountId) {
             const accountRef = doc(familyDataRef, 'bankAccounts', originalSavedAccountId);
             const accountDoc = await transaction.get(accountRef);
             if(accountDoc.exists()){
                const accountData = accountDoc.data();
                transaction.update(accountRef, { blockedBalance: (accountData.blockedBalance || 0) - originalBlockedAmount + savedAmount });
             }
        }

        if (savedFromBankAccountId && savedAmount > 0) {
            const newAccountRef = doc(familyDataRef, 'bankAccounts', savedFromBankAccountId);
            const newAccountDoc = await transaction.get(newAccountRef);
            if (!newAccountDoc.exists()) throw new Error("حساب بانکی انتخاب شده برای پس‌انداز یافت نشد.");
            
            const newAccountData = newAccountDoc.data();
            const availableBalance = newAccountData.balance - (newAccountData.blockedBalance || 0);

            if (!editingGoal || originalSavedAccountId !== savedFromBankAccountId) {
               if (availableBalance < savedAmount) {
                    throw new Error("موجودی حساب برای مسدود کردن مبلغ کافی نیست.");
                }
                transaction.update(newAccountRef, { blockedBalance: (newAccountData.blockedBalance || 0) + savedAmount });
            }
        }
      });

      toast({
        title: 'موفقیت',
        description: `هدف مالی با موفقیت ${
          editingGoal ? 'ویرایش' : 'ذخیره'
        } شد.`,
      });
      setIsFormOpen(false);
      setEditingGoal(null);
    } catch (error: any) {
      if (error.name === 'FirebaseError') {
        const permissionError = new FirestorePermissionError({
            path: `family-data/${FAMILY_DATA_DOC}/financialGoals`,
            operation: 'write',
            requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
            variant: 'destructive',
            title: 'خطا در ثبت هدف',
            description:
            error.message || 'مشکلی در ثبت اطلاعات پیش آمد.',
        });
      }
    }
  }, [user, firestore, editingGoal, toast]);

   const handleAchieveGoal = React.useCallback(async ({ paymentAmount, paymentCardId, categoryId }: { paymentAmount: number; paymentCardId: string; categoryId: string }) => {
    if (!user || !firestore || !achievingGoal) return;
    const goal = achievingGoal;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goal.id);

            if (goal.savedFromBankAccountId && goal.savedAmount) {
                const savedFromAccountRef = doc(familyDataRef, 'bankAccounts', goal.savedFromBankAccountId);
                const savedFromAccountDoc = await transaction.get(savedFromAccountRef);
                if (savedFromAccountDoc.exists()) {
                    const balance = savedFromAccountDoc.data().balance;
                    const blockedBalance = savedFromAccountDoc.data().blockedBalance || 0;
                    transaction.update(savedFromAccountRef, { 
                        blockedBalance: blockedBalance - goal.savedAmount,
                    });
                }
            }
            
            if (paymentAmount > 0 && paymentCardId) {
                 const paymentAccountRef = doc(familyDataRef, 'bankAccounts', paymentCardId);
                 const paymentAccountDoc = await transaction.get(paymentAccountRef);
                 if (!paymentAccountDoc.exists()) throw new Error("کارت پرداخت یافت نشد.");
                 const availableBalance = paymentAccountDoc.data().balance - (paymentAccountDoc.data().blockedBalance || 0);
                 if(availableBalance < paymentAmount) throw new Error("موجودی کارت پرداخت کافی نیست.");
                 transaction.update(paymentAccountRef, { balance: paymentAccountDoc.data().balance - paymentAmount });
            }

            const expenseRef = doc(collection(familyDataRef, 'expenses'));
            transaction.set(expenseRef, {
                id: expenseRef.id,
                ownerId: 'shared', // Goals are shared expenses
                registeredByUserId: user.uid,
                amount: goal.targetAmount,
                bankAccountId: goal.savedFromBankAccountId || paymentCardId,
                categoryId: categoryId,
                date: new Date().toISOString(),
                description: `تحقق هدف: ${goal.name}`,
                type: 'expense',
                goalId: goal.id,
            });
            
            transaction.update(goalRef, { isAchieved: true });
        });
        toast({ title: "تبریک!", description: `هدف "${goal.name}" با موفقیت محقق شد.` });
        setAchievingGoal(null);

    } catch (error: any) {
        if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({
                path: `family-data/${FAMILY_DATA_DOC}/financialGoals/${goal.id}`,
                operation: 'write'
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: "destructive",
                title: "خطا در تحقق هدف",
                description: error.message,
            });
        }
    }
  }, [user, firestore, achievingGoal, toast]);


   const handleRevertGoal = React.useCallback(async (goal: FinancialGoal) => {
    if (!user || !firestore || !bankAccounts) return;
    try {
      const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
      const batch = writeBatch(firestore);
      const goalRef = doc(familyDataRef, 'financialGoals', goal.id);

      const expensesQuery = query(collection(familyDataRef, 'expenses'), where('goalId', '==', goal.id));
      const expensesSnapshot = await getDocs(expensesQuery);
      let expenseAmount = 0;
      let paymentCardId = '';

      expensesSnapshot.forEach(doc => {
          const expenseData = doc.data();
          expenseAmount = expenseData.amount;
          paymentCardId = expenseData.bankAccountId;
          batch.delete(doc.ref);
      });

      if (goal.savedFromBankAccountId && goal.savedAmount) {
          const savedAccountRef = doc(familyDataRef, 'bankAccounts', goal.savedFromBankAccountId);
          batch.update(savedAccountRef, { 'blockedBalance': goal.savedAmount });
      }

      const paidAmount = expenseAmount - (goal.savedAmount || 0);
      if (paidAmount > 0 && paymentCardId) {
          const paymentAccountRef = doc(familyDataRef, 'bankAccounts', paymentCardId);
           batch.update(paymentAccountRef, { 'balance': (bankAccounts?.find(b => b.id === paymentCardId)?.balance || 0) + paidAmount });
      }

      batch.update(goalRef, { isAchieved: false });

      await batch.commit();
      toast({ title: 'موفقیت', description: 'هدف با موفقیت بازگردانی شد.' });
    } catch (error: any) {
       if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({
                path: `family-data/${FAMILY_DATA_DOC}/financialGoals/${goal.id}`,
                operation: 'write'
            });
            errorEmitter.emit('permission-error', permissionError);
       } else {
         toast({ variant: 'destructive', title: 'خطا', description: error.message });
       }
    }
  }, [user, firestore, bankAccounts, toast]);

  const handleDelete = React.useCallback(async (goal: FinancialGoal) => {
    if (!user || !firestore) return;
    const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
    const goalRef = doc(familyDataRef, 'financialGoals', goal.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            if (goal.savedFromBankAccountId && goal.savedAmount) {
                const accountRef = doc(familyDataRef, 'bankAccounts', goal.savedFromBankAccountId);
                const accountDoc = await transaction.get(accountRef);
                if (accountDoc.exists()) {
                    const currentBlocked = accountDoc.data().blockedBalance || 0;
                    transaction.update(accountRef, { blockedBalance: currentBlocked - goal.savedAmount });
                }
            }
            transaction.delete(goalRef);
        });

        toast({ title: "موفقیت", description: "هدف مالی با موفقیت حذف شد." });
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
            const permissionError = new FirestorePermissionError({
                path: goalRef.path,
                operation: 'delete'
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: 'destructive',
                title: 'خطا در حذف هدف',
                description: 'مشکلی در حذف هدف پیش آمد.',
            });
        }
    }
  }, [user, firestore, toast]);

  const handleAddNew = React.useCallback(() => {
    setEditingGoal(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = React.useCallback((goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  }, []);

  const handleOpenAchieveDialog = React.useCallback((goal: FinancialGoal) => {
    setAchievingGoal(goal);
  }, []);

  const isLoading =
    isUserLoading || isLoadingGoals || isLoadingBankAccounts || isLoadingCategories;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          اهداف مالی
        </h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          افزودن هدف جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : isFormOpen ? (
        <GoalForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingGoal}
          bankAccounts={bankAccounts || []}
        />
      ) : (
        <>
          <GoalList
            goals={goals || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAchieve={handleOpenAchieveDialog}
            onRevert={handleRevertGoal}
          />
          {achievingGoal && (
            <AchieveGoalDialog
              goal={achievingGoal}
              bankAccounts={bankAccounts || []}
              categories={categories || []}
              isOpen={!!achievingGoal}
              onOpenChange={() => setAchievingGoal(null)}
              onSubmit={handleAchieveGoal}
            />
          )}
        </>
      )}
    </main>
  );
}
