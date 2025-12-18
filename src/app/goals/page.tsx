
'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  runTransaction,
  writeBatch,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { FinancialGoal, BankAccount, Category, TransactionDetails, Expense, UserProfile, OwnerId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GoalList } from '@/components/goals/goal-list';
import { GoalForm } from '@/components/goals/goal-form';
import { AchieveGoalDialog } from '@/components/goals/achieve-goal-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { AddToGoalDialog } from '@/components/goals/add-to-goal-dialog';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { errorEmitter } from '@/firebase/error-emitter';
import { USER_DETAILS } from '@/lib/constants';

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
  const [isSubmitting, setIsSubmitting] = useState(false);


  const { goals, bankAccounts, categories, users } = allData;

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore || !users || !bankAccounts) return;
    setIsSubmitting(true);
    const { initialContributionAmount = 0, initialContributionBankAccountId, ...goalData } = values;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const newGoalRef = doc(collection(familyDataRef, 'financialGoals'));

            const newGoalData: Omit<FinancialGoal, 'id'> = {
                ...goalData,
                targetDate: goalData.targetDate.toISOString(),
                registeredByUserId: user.uid,
                isAchieved: false,
                currentAmount: 0,
                contributions: [],
            };
            
            if (initialContributionBankAccountId && initialContributionAmount > 0) {
                const accountRef = doc(familyDataRef, 'bankAccounts', initialContributionBankAccountId);
                const initialAccountDoc = await transaction.get(accountRef);
                if (!initialAccountDoc.exists()) throw new Error("حساب بانکی انتخاب شده برای پس‌انداز یافت نشد.");
                
                const accountData = initialAccountDoc.data() as BankAccount;
                const availableBalance = accountData.balance - (accountData.blockedBalance || 0);
                if (availableBalance < initialContributionAmount) {
                    throw new Error("موجودی قابل استفاده حساب برای این مبلغ کافی نیست.");
                }
                
                const contributionDate = new Date().toISOString();
                const newExpenseRef = doc(collection(familyDataRef, 'expenses'));
                const balanceBefore = accountData.balance;
                const balanceAfter = balanceBefore - initialContributionAmount;

                // Create the expense for the initial contribution
                 transaction.set(newExpenseRef, {
                    id: newExpenseRef.id,
                    ownerId: accountData.ownerId,
                    registeredByUserId: user.uid,
                    amount: initialContributionAmount,
                    bankAccountId: initialContributionBankAccountId,
                    categoryId: categories.find(c => c.name.includes('پس‌انداز'))?.id || 'goal_savings',
                    date: contributionDate,
                    description: `پس انداز اولیه برای هدف: ${goalData.name}`,
                    type: 'expense' as const,
                    subType: 'goal_contribution' as const,
                    goalId: newGoalRef.id,
                    expenseFor: goalData.ownerId,
                    createdAt: serverTimestamp(),
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceAfter, // Note: total balance decreases
                });
                
                // Add contribution record to the goal
                newGoalData.contributions.push({
                    id: newExpenseRef.id,
                    bankAccountId: initialContributionBankAccountId,
                    amount: initialContributionAmount,
                    date: contributionDate,
                    registeredByUserId: user.uid,
                });
                newGoalData.currentAmount = initialContributionAmount;
                
                // Update account balances
                const newBlockedBalance = (accountData.blockedBalance || 0) + initialContributionAmount;
                transaction.update(accountRef, { balance: balanceAfter, blockedBalance: newBlockedBalance });
            }
            
            transaction.set(newGoalRef, { ...newGoalData, id: newGoalRef.id });
        });

      toast({
        title: 'موفقیت',
        description: `هدف مالی جدید با موفقیت ذخیره شد.`,
      });
      setIsFormOpen(false);
      
      const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
      const ownerId = values.ownerId as OwnerId;
      const ownerName = ownerId === 'shared' ? 'مشترک' : USER_DETAILS[ownerId]?.firstName || 'نامشخص';
      const priorityMap = { 'low': 'پایین', 'medium': 'متوسط', 'high': 'بالا' };
      
      const contributionAccount = bankAccounts.find(b => b.id === initialContributionBankAccountId);
      const accountOwnerId = contributionAccount?.ownerId as 'ali' | 'fatemeh' | 'shared_account';
      const contributionAccountOwnerName = accountOwnerId === 'shared_account' ? 'مشترک' : (USER_DETAILS[accountOwnerId as 'ali' | 'fatemeh']?.firstName || 'نامشخص');

      const notificationDetails: TransactionDetails = {
          type: 'goal',
          title: `هدف جدید: ${values.name}`,
          amount: values.targetAmount,
          date: new Date().toISOString(),
          icon: 'Target',
          color: 'rgb(161 98 7)',
          registeredBy: currentUserFirstName,
          expenseFor: ownerName,
          properties: [
              { label: 'تاریخ هدف', value: formatJalaliDate(values.targetDate) },
              { label: 'اولویت', value: priorityMap[values.priority as keyof typeof priorityMap] },
              ...(initialContributionAmount > 0 && contributionAccount ? [
                  { label: 'پس‌انداز اولیه', value: formatCurrency(initialContributionAmount, 'IRT') },
                  { label: 'از کارت', value: `${contributionAccount.bankName} (${contributionAccountOwnerName})` },
              ] : [])
          ]
      };
      await sendSystemNotification(firestore, user.uid, notificationDetails);

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
    } finally {
        setIsSubmitting(false);
    }
  }, [user, firestore, toast, bankAccounts, users, categories]);

  const handleAddToGoal = useCallback(async ({ goal, amount, bankAccountId }: { goal: FinancialGoal, amount: number, bankAccountId: string }) => {
     if (!user || !firestore || !users || !categories) return;
     setIsSubmitting(true);

     try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goal.id);
            const accountRef = doc(familyDataRef, 'bankAccounts', bankAccountId);
            const expenseColRef = collection(familyDataRef, 'expenses');
            
            const accountDoc = await transaction.get(accountRef);
            if (!accountDoc.exists()) throw new Error("حساب بانکی انتخاب شده یافت نشد.");
            
            const accountData = accountDoc.data()!;
            const availableBalance = accountData.balance - (accountData.blockedBalance || 0);
            if (availableBalance < amount) throw new Error("موجودی قابل استفاده حساب کافی نیست.");
            
            const goalDoc = await transaction.get(goalRef);
            if (!goalDoc.exists()) throw new Error("هدف مالی مورد نظر یافت نشد.");
            const goalData = goalDoc.data()!;

            let expenseCategoryId = categories.find(c => c.name.includes('پس‌انداز') || c.name.includes('اهداف'))?.id;
            if (!expenseCategoryId) {
                const tempCatRef = doc(collection(familyDataRef, 'categories'));
                expenseCategoryId = tempCatRef.id;
                transaction.set(tempCatRef, { id: expenseCategoryId, name: 'پس‌انداز و اهداف', description: 'مبالغ کنار گذاشته شده برای اهداف مالی' });
            }

            const contributionDate = new Date().toISOString();
            const newExpenseRef = doc(expenseColRef);
            const balanceBefore = accountData.balance;
            const balanceAfter = balanceBefore - amount;
            
            transaction.set(newExpenseRef, {
                id: newExpenseRef.id,
                ownerId: accountData.ownerId,
                registeredByUserId: user.uid,
                amount,
                bankAccountId,
                categoryId: expenseCategoryId,
                date: contributionDate,
                description: `پس انداز برای هدف: ${goal.name}`,
                type: 'expense' as const,
                subType: 'goal_contribution' as const,
                goalId: goal.id,
                expenseFor: goal.ownerId,
                createdAt: serverTimestamp(),
                balanceBefore: balanceBefore,
                balanceAfter: balanceAfter,
            });

            const newContribution = { 
                id: newExpenseRef.id,
                amount, 
                bankAccountId, 
                date: contributionDate, 
                registeredByUserId: user.uid 
            };
            
            const newContributions = [...(goalData.contributions || []), newContribution];
            const newCurrentAmount = goalData.currentAmount + amount;
            const newBlockedBalance = (accountData.blockedBalance || 0) + amount;
            
            transaction.update(accountRef, { balance: balanceAfter, blockedBalance: newBlockedBalance });
            transaction.update(goalRef, { contributions: newContributions, currentAmount: newCurrentAmount });

        });

        toast({ title: 'موفقیت', description: `مبلغ با موفقیت به پس‌انداز هدف "${goal.name}" اضافه شد.` });
        setContributingGoal(null);

        const bankAccount = bankAccounts.find(b => b.id === bankAccountId);
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        
        const accountOwnerId = bankAccount?.ownerId as 'ali' | 'fatemeh' | 'shared_account';
        const accountOwnerName = accountOwnerId === 'shared_account' ? 'مشترک' : (USER_DETAILS[accountOwnerId as 'ali' | 'fatemeh']?.firstName || 'نامشخص');

        const notificationDetails: TransactionDetails = {
            type: 'goal',
            title: `افزایش پس انداز برای: ${goal.name}`,
            amount: amount,
            date: new Date().toISOString(),
            icon: 'PlusCircle',
            color: 'rgb(34 197 94)',
            registeredBy: currentUserFirstName,
            expenseFor: USER_DETAILS[goal.ownerId as 'ali' | 'fatemeh']?.firstName || 'مشترک',
            properties: [
                { label: 'از حساب', value: `${bankAccount?.bankName} (${accountOwnerName})` },
                { label: 'مبلغ جدید پس‌انداز', value: formatCurrency(goal.currentAmount + amount, 'IRT') },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);

     } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در افزودن پس‌انداز', description: error.message || "مشکلی در عملیات پیش آمد." });
     } finally {
        setIsSubmitting(false);
     }
  }, [user, firestore, toast, bankAccounts, users, categories]);


   const handleAchieveGoal = useCallback(async ({ goal, actualCost, paymentCardId }: { goal: FinancialGoal; actualCost: number; paymentCardId?: string; }) => {
    if (!user || !firestore || !categories || !users) return;
    setIsSubmitting(true);
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
            
            const savedPortion = goal.currentAmount;
            const cashPaymentNeeded = Math.max(0, actualCost - savedPortion);
            
            // Release blocked money by reversing the 'goal_contribution' expenses.
            // These expenses already decreased the balance, so we just unblock the amount.
            for(const contribution of goal.contributions) {
                const contributionAccountRef = doc(familyDataRef, 'bankAccounts', contribution.bankAccountId);
                const contributionAccountDoc = await transaction.get(contributionAccountRef);
                if(contributionAccountDoc.exists()){
                    const accountData = contributionAccountDoc.data()!;
                    const newBlocked = (accountData.blockedBalance || 0) - contribution.amount;
                    transaction.update(contributionAccountRef, { blockedBalance: newBlocked });
                }
            }

            if (cashPaymentNeeded > 0) {
                if (!paymentCardId) throw new Error("برای پرداخت مابقی هزینه، انتخاب کارت الزامی است.");
                const paymentAccountRef = doc(familyDataRef, 'bankAccounts', paymentCardId);
                const paymentAccountDoc = await transaction.get(paymentAccountRef);
                if(!paymentAccountDoc.exists()) throw new Error("کارت پرداخت انتخاب شده یافت نشد.")
                const paymentAccountData = paymentAccountDoc.data()!;
                const availableCash = paymentAccountData.balance - (paymentAccountData.blockedBalance || 0);

                if(availableCash < cashPaymentNeeded) throw new Error(`موجودی کارت پرداخت (${formatCurrency(availableCash, 'IRT')}) برای پرداخت مابقی (${formatCurrency(cashPaymentNeeded, 'IRT')}) کافی نیست.`);
                
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
                currentAmount: 0, // Reset current amount as it's now 'spent'
                // We keep contributions history for records, but they are now considered spent.
            });
        });

        toast({ title: "تبریک!", description: `هدف "${goal.name}" با موفقیت محقق شد.` });
        setAchievingGoal(null);
        
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        
        const paymentAccount = bankAccounts.find(b => b.id === paymentCardId);
        const accountOwnerId = paymentAccount?.ownerId as 'ali' | 'fatemeh' | 'shared_account';
        const paymentAccountOwnerName = accountOwnerId === 'shared_account' ? 'مشترک' : (USER_DETAILS[accountOwnerId as 'ali' | 'fatemeh']?.firstName || 'نامشخص');

        const notificationDetails: TransactionDetails = {
            type: 'payment',
            title: `هدف محقق شد: ${goal.name}`,
            amount: actualCost,
            date: new Date().toISOString(),
            icon: 'PartyPopper',
            color: 'rgb(217 119 6)',
            registeredBy: currentUserFirstName,
            expenseFor: goal.ownerId === 'shared' ? 'مشترک' : USER_DETAILS[goal.ownerId as 'ali' | 'fatemeh'].firstName,
            properties: [
                { label: 'هزینه نهایی', value: formatCurrency(actualCost, 'IRT') },
                ...(cashPaymentNeeded > 0 && paymentAccount ? [
                    { label: 'پرداخت نقدی از', value: `${paymentAccount.bankName} (${paymentAccountOwnerName})` },
                    { label: 'مبلغ نقدی', value: formatCurrency(cashPaymentNeeded, 'IRT') },
                ] : []),
                 { label: 'از محل پس‌انداز', value: formatCurrency(goal.currentAmount, 'IRT') },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);

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
    } finally {
        setIsSubmitting(false);
    }
  }, [user, firestore, categories, users, toast, bankAccounts]);


   const handleRevertGoal = useCallback(async (goal: FinancialGoal) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
        const goalRef = doc(familyDataRef, 'financialGoals', goal.id);

        const expensesQuery = query(collection(familyDataRef, 'expenses'), where('goalId', '==', goal.id));
        const expensesSnapshot = await getDocs(expensesQuery);
        
        const accountRestorations: { [accountId: string]: number } = {};
        
        // Delete all related expenses and calculate balance restorations
        expensesSnapshot.forEach(doc => {
            const expense = doc.data() as Expense;
            if (!accountRestorations[expense.bankAccountId]) {
                accountRestorations[expense.bankAccountId] = 0;
            }
            accountRestorations[expense.bankAccountId] += expense.amount;
            transaction.delete(doc.ref);
        });
        
        // Restore balances and blocked amounts
        for (const accountId in accountRestorations) {
            const accountRef = doc(familyDataRef, 'bankAccounts', accountId);
            const accountDoc = await transaction.get(accountRef);
             if (accountDoc.exists()) {
               const accountData = accountDoc.data()!;
               transaction.update(accountRef, { 
                   'balance': accountData.balance + accountRestorations[accountId],
                });
             }
        }

        // Restore goal state, but keep contributions as they are now considered saved money again
        // We calculate the new blocked balance from the existing contributions.
        let totalBlockedToRestore = 0;
        for (const contribution of goal.contributions) {
            const accountRef = doc(familyDataRef, 'bankAccounts', contribution.bankAccountId);
            const accountDoc = await transaction.get(accountRef);
            if (accountDoc.exists()) {
                const accountData = accountDoc.data() as BankAccount;
                transaction.update(accountRef, {
                    blockedBalance: (accountData.blockedBalance || 0) + contribution.amount
                });
                totalBlockedToRestore += contribution.amount;
            }
        }
        
        transaction.update(goalRef, { 
            isAchieved: false, 
            actualCost: 0,
            currentAmount: totalBlockedToRestore,
        });

      });

      toast({ title: 'موفقیت', description: 'هدف با موفقیت بازگردانی و هزینه‌های آن حذف شد. مبالغ به حساب‌ها و پس‌انداز بازگشت.' });
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
    } finally {
        setIsSubmitting(false);
    }
  }, [user, firestore, toast]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
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
            
            if (goalData.contributions && goalData.contributions.length > 0) {
                 // Unblock money and delete associated expenses
                 for(const contribution of goalData.contributions) {
                    const accountRef = doc(familyDataRef, 'bankAccounts', contribution.bankAccountId);
                    const accountDoc = await transaction.get(accountRef);
                    if(accountDoc.exists()) {
                        const accountData = accountDoc.data()!;
                        const newBlockedBalance = (accountData.blockedBalance || 0) - contribution.amount;
                        // Return the money to the main balance
                        const newBalance = accountData.balance + contribution.amount;
                        transaction.update(accountRef, { balance: newBalance, blockedBalance: newBlockedBalance });
                    }
                    
                    // Delete the 'goal_contribution' expense
                    const expenseRef = doc(familyDataRef, 'expenses', contribution.id);
                    transaction.delete(expenseRef);
                }
            }

            transaction.delete(goalRef);
        });

        toast({ title: "موفقیت", description: "هدف مالی، هزینه‌ها و مبالغ مسدود شده مرتبط با آن با موفقیت حذف شد." });
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
    } finally {
        setIsSubmitting(false);
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
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" passHref>
            <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            اهداف مالی
          </h1>
        </div>
        <div className="hidden md:block">
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                افزودن هدف جدید
            </Button>
        </div>
      </div>

       {isFormOpen && (
        <GoalForm
          onSubmit={handleFormSubmit}
          initialData={editingGoal}
          bankAccounts={bankAccounts || []}
          user={user}
          onCancel={() => { setIsFormOpen(false); setEditingGoal(null); }}
          isSubmitting={isSubmitting}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : !isFormOpen && (
        <>
          <GoalList
            goals={goals || []}
            users={users || []}
            onContribute={handleOpenContributeDialog}
            onAchieve={handleOpenAchieveDialog}
            onRevert={handleRevertGoal}
            onDelete={handleDeleteGoal}
            isSubmitting={isSubmitting}
          />
          {achievingGoal && (
            <AchieveGoalDialog
              goal={achievingGoal}
              bankAccounts={bankAccounts || []}
              isOpen={!!achievingGoal}
              onOpenChange={() => setAchievingGoal(null)}
              onSubmit={handleAchieveGoal}
              isSubmitting={isSubmitting}
            />
          )}
          {contributingGoal && (
             <AddToGoalDialog
                goal={contributingGoal}
                bankAccounts={bankAccounts || []}
                isOpen={!!contributingGoal}
                onOpenChange={() => setContributingGoal(null)}
                onSubmit={handleAddToGoal}
                isSubmitting={isSubmitting}
             />
          )}
        </>
      )}

      {!isFormOpen && (
        <div className="md:hidden fixed bottom-20 right-4 z-50">
            <Button
              onClick={handleAddNew}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg"
              aria-label="افزودن هدف جدید"
            >
              <Plus className="h-6 w-6" />
            </Button>
        </div>
      )}
    </div>
  );
}

