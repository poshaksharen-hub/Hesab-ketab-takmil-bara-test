

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
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import type { FinancialGoal, BankAccount, Category, FinancialGoalContribution, Expense, OwnerId, UserProfile } from '@/lib/types';
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


  const { goals, bankAccounts, categories, users } = allData;

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore) return;
    const { initialContributionAmount = 0, initialContributionBankAccountId, ...goalData } = values;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const expensesRef = collection(familyDataRef, 'expenses');
            
            let initialAccountDoc = null;
            let accountData: BankAccount | null = null;
            if (initialContributionBankAccountId && initialContributionAmount > 0) {
                const accountRef = doc(familyDataRef, 'bankAccounts', initialContributionBankAccountId);
                initialAccountDoc = await transaction.get(accountRef);
                if (!initialAccountDoc.exists()) throw new Error("حساب بانکی انتخاب شده برای پس‌انداز یافت نشد.");
                
                accountData = initialAccountDoc.data() as BankAccount;
                if (accountData.balance < initialContributionAmount) {
                    throw new Error("موجودی حساب برای این مبلغ کافی نیست.");
                }
            }

            const newGoalData: Omit<FinancialGoal, 'id'> = {
                ...goalData,
                registeredByUserId: user.uid,
                isAchieved: false,
                currentAmount: 0,
                contributions: [],
            };

            const newGoalRef = doc(collection(familyDataRef, 'financialGoals'));
             
            if (accountData && initialAccountDoc && initialContributionAmount > 0) {
                newGoalData.contributions.push({
                    bankAccountId: initialContributionBankAccountId,
                    amount: initialContributionAmount,
                    date: new Date().toISOString(),
                    registeredByUserId: user.uid,
                });
                newGoalData.currentAmount = initialContributionAmount;

                const newBalance = accountData.balance - initialContributionAmount;
                transaction.update(initialAccountDoc.ref, { balance: newBalance });

                const expenseRef = doc(expensesRef);
                transaction.set(expenseRef, {
                    id: expenseRef.id,
                    ownerId: accountData.ownerId,
                    registeredByUserId: user.uid,
                    amount: initialContributionAmount,
                    bankAccountId: initialContributionBankAccountId,
                    categoryId: categories.find(c => c.name.includes("سرمایه‌گذاری"))?.id || 'cat-investment',
                    date: new Date().toISOString(),
                    description: `واریز به هدف: ${newGoalData.name}`,
                    type: 'expense' as const,
                    subType: 'goal_contribution' as const,
                    goalId: newGoalRef.id,
                    expenseFor: newGoalData.ownerId,
                    balanceBefore: accountData.balance,
                    balanceAfter: newBalance,
                    createdAt: serverTimestamp(),
                });
            }
            
            transaction.set(newGoalRef, {
                ...newGoalData,
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
  }, [user, firestore, toast, categories]);

  const handleAddToGoal = useCallback(async ({ goal, amount, bankAccountId }: { goal: FinancialGoal, amount: number, bankAccountId: string }) => {
     if (!user || !firestore) return;

     try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goal.id);
            const accountRef = doc(familyDataRef, 'bankAccounts', bankAccountId);
            const expensesRef = collection(familyDataRef, 'expenses');

            const accountDoc = await transaction.get(accountRef);
            if (!accountDoc.exists()) throw new Error("حساب بانکی انتخاب شده یافت نشد.");

            const accountData = accountDoc.data()!;
            if (accountData.balance < amount) throw new Error("موجودی حساب کافی نیست.");

            const goalDoc = await transaction.get(goalRef);
            if (!goalDoc.exists()) throw new Error("هدف مالی مورد نظر یافت نشد.");
            const goalData = goalDoc.data()!;

            const newContributions = [...(goalData.contributions || []), { amount, bankAccountId, date: new Date().toISOString(), registeredByUserId: user.uid }];
            const newCurrentAmount = goalData.currentAmount + amount;
            const newBalance = accountData.balance - amount;

            // Update Account Balance
            transaction.update(accountRef, { balance: newBalance });
            
            // Update Goal
            transaction.update(goalRef, { contributions: newContributions, currentAmount: newCurrentAmount });

            // Create an expense transaction for this contribution
            const expenseRef = doc(expensesRef);
            transaction.set(expenseRef, {
                id: expenseRef.id,
                ownerId: accountData.ownerId,
                registeredByUserId: user.uid,
                amount: amount,
                bankAccountId: bankAccountId,
                categoryId: categories.find(c => c.name.includes("سرمایه‌گذاری"))?.id || 'cat-investment',
                date: new Date().toISOString(),
                description: `واریز به هدف: ${goal.name}`,
                type: 'expense' as const,
                subType: 'goal_contribution' as const,
                goalId: goal.id,
                expenseFor: goal.ownerId,
                balanceBefore: accountData.balance,
                balanceAfter: newBalance,
                createdAt: serverTimestamp(),
            });
        });

        toast({ title: 'موفقیت', description: `مبلغ با موفقیت به پس‌انداز هدف "${goal.name}" اضافه و هزینه آن ثبت شد.` });
        setContributingGoal(null);

     } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در افزودن پس‌انداز', description: error.message || "مشکلی در عملیات پیش آمد." });
     }
  }, [user, firestore, toast, categories]);


   const handleAchieveGoal = useCallback(async ({ goal, actualCost, paymentCardId }: { goal: FinancialGoal; actualCost: number; paymentCardId?: string; }) => {
    if (!user || !firestore || !categories) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goal.id);
            const expensesRef = collection(familyDataRef, 'expenses');
            
            let goalsCategoryId = categories.find(c => c.name === 'اهداف مالی')?.id;
            
            if (!goalsCategoryId) {
                const newCategoryRef = doc(collection(familyDataRef, 'categories'));
                goalsCategoryId = newCategoryRef.id;
                transaction.set(newCategoryRef, {
                    id: goalsCategoryId,
                    name: 'اهداف مالی',
                    description: 'هزینه‌های مربوط به تحقق اهداف مالی'
                });
            }

            const cashPaymentNeeded = Math.max(0, actualCost - goal.currentAmount);

            if (cashPaymentNeeded > 0) {
                if (!paymentCardId) throw new Error("برای پرداخت مابقی هزینه، انتخاب کارت الزامی است.");
                const paymentAccountRef = doc(familyDataRef, 'bankAccounts', paymentCardId);
                const paymentAccountDoc = await transaction.get(paymentAccountRef);
                if(!paymentAccountDoc.exists()) throw new Error("کارت پرداخت انتخاب شده یافت نشد.")
                const paymentAccountData = paymentAccountDoc.data()!;
                if(paymentAccountData.balance < cashPaymentNeeded) throw new Error(`موجودی کارت پرداخت (${formatCurrency(paymentAccountData.balance, 'IRT')}) برای پرداخت مابقی (${formatCurrency(cashPaymentNeeded, 'IRT')}) کافی نیست.`);
                
                const newBalance = paymentAccountData.balance - cashPaymentNeeded;
                transaction.update(paymentAccountRef, { balance: newBalance });

                const expenseRef = doc(expensesRef);
                transaction.set(expenseRef, {
                    id: expenseRef.id,
                    ownerId: paymentAccountData.ownerId,
                    registeredByUserId: user.uid,
                    amount: cashPaymentNeeded,
                    bankAccountId: paymentCardId,
                    categoryId: goalsCategoryId,
                    date: new Date().toISOString(),
                    description: `تحقق هدف (بخش نقدی): ${goal.name}`,
                    type: 'expense' as const,
                    subType: 'goal_cash_portion' as const,
                    goalId: goal.id,
                    expenseFor: goal.ownerId,
                    balanceBefore: paymentAccountData.balance,
                    balanceAfter: newBalance,
                    createdAt: serverTimestamp(),
                });
            }

            transaction.update(goalRef, { 
                isAchieved: true, 
                actualCost: actualCost,
                currentAmount: 0, // Reset current amount after achievement
                contributions: [], // Clear contributions
            });
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
      await runTransaction(firestore, async (transaction) => {
        const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
        const goalRef = doc(familyDataRef, 'financialGoals', goal.id);

        const expensesQuery = query(collection(familyDataRef, 'expenses'), where('goalId', '==', goal.id));
        const expensesSnapshot = await getDocs(expensesQuery);
        
        const accountRestorations: { [accountId: string]: { balance: number, blocked: number } } = {};

        expensesSnapshot.forEach(doc => {
            const expense = doc.data() as Expense;
            if (!accountRestorations[expense.bankAccountId]) {
                accountRestorations[expense.bankAccountId] = { balance: 0, blocked: 0 };
            }
            accountRestorations[expense.bankAccountId].balance += expense.amount;
            transaction.delete(doc.ref);
        });
        
        transaction.update(goalRef, { 
            isAchieved: false, 
            actualCost: 0,
            currentAmount: goal.actualCost, // Restore currentAmount to what was spent
        });

        for (const accountId in accountRestorations) {
            const accountRef = doc(familyDataRef, 'bankAccounts', accountId);
            const accountDoc = await transaction.get(accountRef);
             if (accountDoc.exists()) {
               const accountData = accountDoc.data()!;
               transaction.update(accountRef, { 
                   'balance': accountData.balance + accountRestorations[accountId].balance,
                });
             }
        }
      });

      toast({ title: 'موفقیت', description: 'هدف با موفقیت بازگردانی و هزینه‌های آن حذف شد.' });
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

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (!user || !firestore) return;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goalId);
            const goalDoc = await transaction.get(goalRef);
            if (!goalDoc.exists()) throw new Error("هدف مورد نظر یافت نشد.");
            
            const goalData = goalDoc.data() as FinancialGoal;

            if (goalData.isAchieved) {
                throw new Error("لطفا ابتدا هدف را بازگردانی کنید و سپس اقدام به حذف نمایید.");
            }
            
            const contributionExpensesQuery = query(collection(familyDataRef, 'expenses'), where('goalId', '==', goalId), where('subType', '==', 'goal_contribution'));
            const contributionExpensesSnapshot = await getDocs(contributionExpensesQuery);
            
            contributionExpensesSnapshot.forEach(doc => {
                const expense = doc.data() as Expense;
                // Since we are deleting the goal, we just delete the expense record
                // The money is already spent from the balance.
                transaction.delete(doc.ref);
            });

            transaction.delete(goalRef);
        });

        toast({ title: "موفقیت", description: "هدف مالی با موفقیت حذف شد." });
    } catch (error: any) {
         if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({
                path: `family-data/shared-data/financialGoals/${goalId}`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در حذف هدف",
            description: error.message || "مشکلی در حذف هدف پیش آمد.",
          });
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
            users={users || []}
            onContribute={handleOpenContributeDialog}
            onAchieve={handleOpenAchieveDialog}
            onRevert={handleRevertGoal}
            onDelete={handleDeleteGoal}
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
