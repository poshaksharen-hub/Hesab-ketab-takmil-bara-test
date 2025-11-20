
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
  serverTimestamp,
} from 'firebase/firestore';
import type { FinancialGoal, BankAccount, Category, FinancialGoalContribution, Expense, OwnerId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GoalList } from '@/components/goals/goal-list';
import { GoalForm } from '@/components/goals/goal-form';
import { AchieveGoalDialog } from '@/components/goals/achieve-goal-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { AddToGoalDialog } from '@/components/goals/add-to-goal-dialog';
import { formatCurrency } from '@/lib/utils';

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
                const accountRef = doc(familyDataRef, 'bankAccounts', initialContributionBankAccountId);
                initialAccountDoc = await transaction.get(accountRef);
                if (!initialAccountDoc.exists()) throw new Error("حساب بانکی انتخاب شده برای پس‌انداز یافت نشد.");
                
                const accountData = initialAccountDoc.data();
                const availableBalance = accountData.balance - (accountData.blockedBalance || 0);
                if (availableBalance < initialContributionAmount) {
                    throw new Error("موجودی حساب برای مسدود کردن مبلغ کافی نیست.");
                }
            }

            // --- WRITES ---
            const newGoal: Omit<FinancialGoal, 'id'> = {
                ...goalData,
                registeredByUserId: user.uid,
                isAchieved: false,
                currentAmount: 0,
                contributions: [],
            };

            if (initialContributionBankAccountId && initialContributionAmount > 0) {
                newGoal.contributions.push({
                    bankAccountId: initialContributionBankAccountId,
                    amount: initialContributionAmount,
                    date: new Date().toISOString(),
                });
                newGoal.currentAmount = initialContributionAmount;

                if (initialAccountDoc) {
                    const accountData = initialAccountDoc.data();
                    transaction.update(initialAccountDoc.ref, { blockedBalance: (accountData.blockedBalance || 0) + initialContributionAmount });
                }
            }

            transaction.set(newGoalRef, {
                ...newGoal,
                id: newGoalRef.id,
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
            path: `family-data/${FAMILY_DATA_DOC}/financialGoals`,
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


   const handleAchieveGoal = useCallback(async ({ goal, actualCost, paymentCardId }: { goal: FinancialGoal; actualCost: number; paymentCardId?: string; }) => {
    if (!user || !firestore || !categories) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goal.id);
            const expensesRef = collection(familyDataRef, 'expenses');
            
            // --- Step 1: Find or create the 'Goals' category ---
            const categoryRef = collection(familyDataRef, 'categories');
            const categoryQuery = query(categoryRef, where("name", "==", "اهداف مالی"));
            const categorySnapshot = await getDocs(categoryQuery); // This read is allowed before transaction writes
            
            let goalsCategoryId: string;
            if (categorySnapshot.empty) {
                const newCategoryRef = doc(categoryRef);
                goalsCategoryId = newCategoryRef.id;
                transaction.set(newCategoryRef, {
                    id: goalsCategoryId,
                    name: 'اهداف مالی',
                    description: 'هزینه‌های مربوط به تحقق اهداف مالی'
                });
            } else {
                goalsCategoryId = categorySnapshot.docs[0].id;
            }

            // --- Step 2: READS ---
            const accountRefsToRead: { [id: string]: any } = {};
            (goal.contributions || []).forEach(c => {
                if (!accountRefsToRead[c.bankAccountId]) {
                    accountRefsToRead[c.bankAccountId] = doc(familyDataRef, 'bankAccounts', c.bankAccountId);
                }
            });
            if (paymentCardId && !accountRefsToRead[paymentCardId]) {
                 accountRefsToRead[paymentCardId] = doc(familyDataRef, 'bankAccounts', paymentCardId);
            }
            
            const accountDocs = await Promise.all(Object.values(accountRefsToRead).map(ref => transaction.get(ref)));
            
            const accountDataMap = new Map<string, BankAccount>();
            accountDocs.forEach(docSnap => {
                if (docSnap.exists()) {
                    accountDataMap.set(docSnap.id, docSnap.data() as BankAccount);
                } else {
                    throw new Error(`حساب بانکی با شناسه ${docSnap.id} یافت نشد.`);
                }
            });

            const cashPaymentNeeded = Math.max(0, actualCost - goal.currentAmount);

            if (cashPaymentNeeded > 0) {
                if (!paymentCardId) throw new Error("برای پرداخت مابقی هزینه، انتخاب کارت الزامی است.");
                const paymentAccountData = accountDataMap.get(paymentCardId);
                if(!paymentAccountData) throw new Error("کارت پرداخت انتخاب شده یافت نشد.")
                const availableBalance = paymentAccountData.balance - (paymentAccountData.blockedBalance || 0);
                if(availableBalance < cashPaymentNeeded) throw new Error(`موجودی کارت پرداخت (${formatCurrency(availableBalance, 'IRT')}) برای پرداخت مابقی (${formatCurrency(cashPaymentNeeded, 'IRT')}) کافی نیست.`);
            }

            // --- Step 3: WRITES ---
            const nowISO = new Date().toISOString();
            
            // Create expenses for each contribution & update accounts
            for(const contribution of (goal.contributions || [])) {
                const accountData = accountDataMap.get(contribution.bankAccountId)!;
                
                // Unblock and deduct balance
                const accountRef = doc(familyDataRef, 'bankAccounts', contribution.bankAccountId);
                transaction.update(accountRef, { 
                    balance: accountData.balance - contribution.amount,
                    blockedBalance: (accountData.blockedBalance || 0) - contribution.amount,
                });

                // Create expense record
                const expenseRef = doc(expensesRef);
                transaction.set(expenseRef, {
                    id: expenseRef.id,
                    ownerId: accountData.ownerId,
                    registeredByUserId: user.uid,
                    amount: contribution.amount,
                    bankAccountId: contribution.bankAccountId,
                    categoryId: goalsCategoryId,
                    date: nowISO,
                    description: `تحقق هدف (بخش پس‌انداز): ${goal.name}`,
                    type: 'expense',
                    subType: 'goal_saved_portion',
                    goalId: goal.id,
                } as Omit<Expense, 'createdAt' | 'updatedAt'>);
            }
            
            // Create expense for the cash portion
            if (cashPaymentNeeded > 0 && paymentCardId) {
                 const paymentAccountData = accountDataMap.get(paymentCardId)!;
                 const paymentAccountRef = doc(familyDataRef, 'bankAccounts', paymentCardId);
                 
                 // Deduct cash payment from the payment card
                 transaction.update(paymentAccountRef, { 
                    balance: paymentAccountData.balance - cashPaymentNeeded 
                 });

                 // Create expense record
                 const expenseRef = doc(expensesRef);
                 transaction.set(expenseRef, {
                    id: expenseRef.id,
                    ownerId: paymentAccountData.ownerId,
                    registeredByUserId: user.uid,
                    amount: cashPaymentNeeded,
                    bankAccountId: paymentCardId,
                    categoryId: goalsCategoryId,
                    date: nowISO,
                    description: `تحقق هدف (بخش نقدی): ${goal.name}`,
                    type: 'expense',
                    subType: 'goal_cash_portion',
                    goalId: goal.id,
                 } as Omit<Expense, 'createdAt' | 'updatedAt'>);
            }

            // Update goal status
            transaction.update(goalRef, { isAchieved: true, actualCost: actualCost });
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
  }, [user, firestore, categories, toast]);


   const handleRevertGoal = useCallback(async (goal: FinancialGoal) => {
    if (!user || !firestore) return;
    try {
      const batch = writeBatch(firestore);
      const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
      const goalRef = doc(familyDataRef, 'financialGoals', goal.id);

      // Find and delete all expenses for this goal
      const expensesQuery = query(collection(familyDataRef, 'expenses'), where('goalId', '==', goal.id));
      const expensesSnapshot = await getDocs(expensesQuery);
      
      const expenseRestorations: { [accountId: string]: number } = {};
      expensesSnapshot.forEach(doc => {
          const expense = doc.data() as Expense;
          expenseRestorations[expense.bankAccountId] = (expenseRestorations[expense.bankAccountId] || 0) + expense.amount;
          batch.delete(doc.ref);
      });

      // Restore balances for all affected accounts
      for (const accountId in expenseRestorations) {
          const accountRef = doc(familyDataRef, 'bankAccounts', accountId);
          const accountDoc = await getDoc(accountRef);
           if (accountDoc.exists()) {
             const accountData = accountDoc.data() as BankAccount;
             batch.update(accountRef, { 'balance': accountData.balance + expenseRestorations[accountId] });
           }
      }

      // Re-block the saved amounts
      for (const contribution of (goal.contributions || [])) {
        const savedAccountRef = doc(familyDataRef, 'bankAccounts', contribution.bankAccountId);
        const savedAccountDoc = await getDoc(savedAccountRef);
        if (savedAccountDoc.exists()) {
          const accountData = savedAccountDoc.data() as BankAccount;
          batch.update(savedAccountRef, { 'blockedBalance': (accountData.blockedBalance || 0) + contribution.amount });
        }
      }
      
      batch.update(goalRef, { isAchieved: false, actualCost: 0 });

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
