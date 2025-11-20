
'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  runTransaction,
  writeBatch,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
} from 'firebase/firestore';
import type { FinancialGoal, BankAccount, Category, FinancialGoalContribution, Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GoalList } from '@/components/goals/goal-list';
import { GoalForm } from '@/components/goals/goal-form';
import { AchieveGoalDialog } from '@/components/goals/achieve-goal-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { AddToGoalDialog } from '@/components/goals/add-to-goal-dialog';

const FAMILY_DATA_DOC = 'shared-data';

export default function GoalsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [achievingGoal, setAchievingGoal] = useState<FinancialGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<FinancialGoal | null>(null);


  const { goals, bankAccounts, categories } = allData;

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore) return;
    const { initialContributionAmount = 0, initialContributionBankAccountId, ...goalData } = values;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const newGoalRef = doc(collection(familyDataRef, 'financialGoals'));

            // --- READS ---
            let initialAccountDoc = null;
            if (initialContributionBankAccountId && initialContributionAmount > 0) {
                initialAccountDoc = await transaction.get(doc(familyDataRef, 'bankAccounts', initialContributionBankAccountId));
                if (!initialAccountDoc.exists()) throw new Error("حساب بانکی انتخاب شده برای پس‌انداز یافت نشد.");
                
                const accountData = initialAccountDoc.data();
                const availableBalance = accountData.balance - (accountData.blockedBalance || 0);
                if (availableBalance < initialContributionAmount) {
                    throw new Error("موجودی حساب برای مسدود کردن مبلغ کافی نیست.");
                }
            }

            // --- WRITES ---
            const contributions: FinancialGoalContribution[] = [];
            let currentAmount = 0;

            if (initialContributionBankAccountId && initialContributionAmount > 0) {
                contributions.push({
                    bankAccountId: initialContributionBankAccountId,
                    amount: initialContributionAmount,
                    date: new Date().toISOString(),
                });
                currentAmount = initialContributionAmount;

                if (initialAccountDoc) {
                    const accountData = initialAccountDoc.data();
                    transaction.update(initialAccountDoc.ref, { blockedBalance: (accountData.blockedBalance || 0) + initialContributionAmount });
                }
            }

            transaction.set(newGoalRef, {
                ...goalData,
                id: newGoalRef.id,
                registeredByUserId: user.uid,
                isAchieved: false,
                currentAmount: currentAmount,
                contributions: contributions,
            });
        });

      toast({
        title: 'موفقیت',
        description: `هدف مالی جدید با موفقیت ذخیره شد.`,
      });
      setIsFormOpen(false);

    } catch (error: any) {
      if (error.name === 'FirebaseError') {
        const permissionError = new FirestorePermissionError({
            path: `family-data/${FAMILY_DATA_DOC}`, // General path for transaction
            operation: 'write',
            requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
            variant: 'destructive',
            title: 'خطا در ثبت هدف',
            description: error.message || 'مشکلی در ثبت اطلاعات پیش آمد.',
        });
      }
    }
  }, [user, firestore, toast]);

  const handleAddToGoal = useCallback(async ({ goal, amount, bankAccountId }: { goal: FinancialGoal, amount: number, bankAccountId: string }) => {
     if (!user || !firestore) return;

     try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goal.id);
            const accountRef = doc(familyDataRef, 'bankAccounts', bankAccountId);

            const accountDoc = await transaction.get(accountRef);
            if (!accountDoc.exists()) throw new Error("حساب بانکی انتخاب شده یافت نشد.");

            const accountData = accountDoc.data();
            const availableBalance = accountData.balance - (accountData.blockedBalance || 0);
            if (availableBalance < amount) throw new Error("موجودی قابل استفاده حساب کافی نیست.");

            const goalDoc = await transaction.get(goalRef);
            if (!goalDoc.exists()) throw new Error("هدف مالی مورد نظر یافت نشد.");
            const goalData = goalDoc.data();

            const newContributions = [...(goalData.contributions || []), { amount, bankAccountId, date: new Date().toISOString() }];
            const newCurrentAmount = goalData.currentAmount + amount;

            transaction.update(accountRef, { blockedBalance: (accountData.blockedBalance || 0) + amount });
            transaction.update(goalRef, { contributions: newContributions, currentAmount: newCurrentAmount });
        });

        toast({ title: 'موفقیت', description: `مبلغ با موفقیت به پس‌انداز هدف "${goal.name}" اضافه شد.` });
        setContributingGoal(null);

     } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در افزودن پس‌انداز', description: error.message || "مشکلی در عملیات پیش آمد." });
     }
  }, [user, firestore, toast]);


   const handleAchieveGoal = useCallback(async ({ paymentAmount, paymentCardId }: { paymentAmount: number; paymentCardId: string; }) => {
    if (!user || !firestore || !achievingGoal) return;
    const goal = achievingGoal;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goal.id);
            const categoriesRef = collection(familyDataRef, 'categories');
            
            // --- Step 1: READS ---
            const accountRefs = (goal.contributions || []).map(c => doc(familyDataRef, 'bankAccounts', c.bankAccountId));
            if (paymentAmount > 0 && paymentCardId) {
                const paymentAccountRef = doc(familyDataRef, 'bankAccounts', paymentCardId);
                if (!accountRefs.find(ref => ref.path === paymentAccountRef.path)) {
                    accountRefs.push(paymentAccountRef);
                }
            }
            const accountDocs = await Promise.all(accountRefs.map(ref => transaction.get(ref)));

            let goalsCategory: Category | null = null;
            const categoryQuery = query(categoriesRef, where('name', '==', 'اهداف مالی'));
            const categorySnapshot = await getDocs(categoryQuery);
            if (!categorySnapshot.empty) {
                goalsCategory = categorySnapshot.docs[0].data() as Category;
            }

            const accountsData: { [key: string]: BankAccount } = {};
            for (const doc of accountDocs) {
                if (!doc.exists()) throw new Error(`حساب بانکی با شناسه ${doc.id} یافت نشد.`);
                accountsData[doc.id] = doc.data() as BankAccount;
            }
            
            if (paymentAmount > 0 && paymentCardId) {
                const paymentAccountData = accountsData[paymentCardId];
                const availableBalance = paymentAccountData.balance - (paymentAccountData.blockedBalance || 0);
                if(availableBalance < paymentAmount) throw new Error("موجودی کارت پرداخت کافی نیست.");
            }

            // --- Step 2: WRITES ---
            
            // Create goals category if it doesn't exist
            let categoryId = goalsCategory?.id;
            if (!goalsCategory) {
                const newCategoryRef = doc(categoriesRef);
                categoryId = newCategoryRef.id;
                transaction.set(newCategoryRef, {
                    id: categoryId,
                    name: 'اهداف مالی',
                    description: 'هزینه‌های مربوط به تحقق اهداف مالی'
                });
            }

            const expenseRef = doc(collection(familyDataRef, 'expenses'));
            transaction.set(expenseRef, {
                id: expenseRef.id,
                ownerId: goal.ownerId, 
                registeredByUserId: user.uid,
                amount: goal.targetAmount,
                bankAccountId: paymentCardId || goal.contributions[0]?.bankAccountId, // Fallback
                categoryId: categoryId,
                date: new Date().toISOString(),
                description: `تحقق هدف: ${goal.name}`,
                type: 'expense',
                goalId: goal.id,
            } as Omit<Expense, 'createdAt' | 'updatedAt'>);

            for(const contribution of (goal.contributions || [])) {
                const accountRef = doc(familyDataRef, 'bankAccounts', contribution.bankAccountId);
                const accountData = accountsData[contribution.bankAccountId];
                transaction.update(accountRef, { 
                    blockedBalance: (accountData.blockedBalance || 0) - contribution.amount,
                });
            }
            
            if (paymentAmount > 0 && paymentCardId) {
                 const paymentAccountRef = doc(familyDataRef, 'bankAccounts', paymentCardId);
                 const paymentAccountData = accountsData[paymentCardId];
                 transaction.update(paymentAccountRef, { 
                    balance: paymentAccountData.balance - paymentAmount 
                 });
            }

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


   const handleRevertGoal = useCallback(async (goal: FinancialGoal) => {
    if (!user || !firestore) return;
    try {
      const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
      const batch = writeBatch(firestore);
      const goalRef = doc(familyDataRef, 'financialGoals', goal.id);

      const expensesQuery = query(collection(familyDataRef, 'expenses'), where('goalId', '==', goal.id));
      const expensesSnapshot = await getDocs(expensesQuery);
      
      let associatedExpense: any = null;
      expensesSnapshot.forEach(doc => {
          associatedExpense = doc.data();
          batch.delete(doc.ref);
      });

      for (const contribution of (goal.contributions || [])) {
        const savedAccountRef = doc(familyDataRef, 'bankAccounts', contribution.bankAccountId);
        const savedAccountDoc = await getDocs(query(collection(familyDataRef, 'bankAccounts'), where('id', '==', contribution.bankAccountId)));
        if (!savedAccountDoc.empty) {
          const accountData = savedAccountDoc.docs[0].data();
          batch.update(savedAccountRef, { 'blockedBalance': (accountData.blockedBalance || 0) + contribution.amount });
        }
      }

      if (associatedExpense) {
          const paymentAmount = associatedExpense.amount - goal.currentAmount;
          if (paymentAmount > 0 && associatedExpense.bankAccountId) {
              const paymentAccountRef = doc(familyDataRef, 'bankAccounts', associatedExpense.bankAccountId);
              const paymentAccountDoc = await getDocs(query(collection(familyDataRef, 'bankAccounts'), where('id', '==', associatedExpense.bankAccountId)));
              if (!paymentAccountDoc.empty) {
                 const accountData = paymentAccountDoc.docs[0].data();
                 batch.update(paymentAccountRef, { 'balance': accountData.balance + paymentAmount });
              }
          }
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
  }, [user, firestore, toast]);

  const handleAddNew = useCallback(() => {
    setEditingGoal(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenAchieveDialog = useCallback((goal: FinancialGoal) => {
    setAchievingGoal(goal);
  }, []);
  
  const handleOpenContributeDialog = useCallback((goal: FinancialGoal) => {
    setContributingGoal(goal);
  }, []);

  const isLoading = isUserLoading || isDashboardLoading;

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
          user={user}
        />
      ) : (
        <>
          <GoalList
            goals={goals || []}
            onContribute={handleOpenContributeDialog}
            onAchieve={handleOpenAchieveDialog}
            onRevert={handleRevertGoal}
          />
          {achievingGoal && (
            <AchieveGoalDialog
              goal={achievingGoal}
              bankAccounts={bankAccounts || []}
              isOpen={!!achievingGoal}
              onOpenChange={() => setAchievingGoal(null)}
              onSubmit={handleAchieveGoal}
            />
          )}
          {contributingGoal && (
             <AddToGoalDialog
                goal={contributingGoal}
                bankAccounts={bankAccounts || []}
                isOpen={!!contributingGoal}
                onOpenChange={() => setContributingGoal(null)}
                onSubmit={handleAddToGoal}
             />
          )}
        </>
      )}
    </main>
  );
}
