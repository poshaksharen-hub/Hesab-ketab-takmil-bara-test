
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
} from 'firebase/firestore';
import type { FinancialGoal, BankAccount, Category, TransactionDetails, Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GoalList } from '@/components/goals/goal-list';
import { GoalForm } from '@/components/goals/goal-form';
import { AchieveGoalDialog } from '@/components/goals/achieve-goal-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { AddToGoalDialog } from '@/components/goals/add-to-goal-dialog';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { errorEmitter } from '@/firebase/error-emitter';

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
            
            let initialAccountDoc = null;
            let accountData: BankAccount | null = null;
            if (initialContributionBankAccountId && initialContributionAmount > 0) {
                const accountRef = doc(familyDataRef, 'bankAccounts', initialContributionBankAccountId);
                initialAccountDoc = await transaction.get(accountRef);
                if (!initialAccountDoc.exists()) throw new Error("حساب بانکی انتخاب شده برای پس‌انداز یافت نشد.");
                
                accountData = initialAccountDoc.data() as BankAccount;
                const availableBalance = accountData.balance - (accountData.blockedBalance || 0);
                if (availableBalance < initialContributionAmount) {
                    throw new Error("موجودی قابل استفاده حساب برای این مبلغ کافی نیست.");
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

                 const newBlockedBalance = (accountData.blockedBalance || 0) + initialContributionAmount;
                 transaction.update(initialAccountDoc.ref, { blockedBalance: newBlockedBalance });
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
     if (!user || !firestore || !users) return;

     try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goal.id);
            const accountRef = doc(familyDataRef, 'bankAccounts', bankAccountId);

            const accountDoc = await transaction.get(accountRef);
            if (!accountDoc.exists()) throw new Error("حساب بانکی انتخاب شده یافت نشد.");

            const accountData = accountDoc.data()!;
            const availableBalance = accountData.balance - (accountData.blockedBalance || 0);
            if (availableBalance < amount) throw new Error("موجودی قابل استفاده حساب کافی نیست.");

            const goalDoc = await transaction.get(goalRef);
            if (!goalDoc.exists()) throw new Error("هدف مالی مورد نظر یافت نشد.");
            const goalData = goalDoc.data()!;

            const newContributions = [...(goalData.contributions || []), { amount, bankAccountId, date: new Date().toISOString(), registeredByUserId: user.uid }];
            const newCurrentAmount = goalData.currentAmount + amount;
            const newBlockedBalance = (accountData.blockedBalance || 0) + amount;
            
            transaction.update(accountRef, { blockedBalance: newBlockedBalance });
            
            transaction.update(goalRef, { contributions: newContributions, currentAmount: newCurrentAmount });

        });

        toast({ title: 'موفقیت', description: `مبلغ با موفقیت به پس‌انداز هدف "${goal.name}" اضافه و در حساب شما مسدود شد.` });
        setContributingGoal(null);

        const bankAccount = bankAccounts.find(b => b.id === bankAccountId);
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const notificationDetails: TransactionDetails = {
            type: 'goal',
            title: `افزایش پس انداز برای هدف: ${goal.name}`,
            amount: amount,
            date: new Date().toISOString(),
            icon: 'PlusCircle',
            color: 'rgb(34 197 94)',
            registeredBy: currentUserFirstName,
            properties: [
                { label: 'از حساب', value: bankAccount?.bankName },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails, currentUserFirstName);

     } catch (error: any) {
        toast({ variant: 'destructive', title: 'خطا در افزودن پس‌انداز', description: error.message || "مشکلی در عملیات پیش آمد." });
     }
  }, [user, firestore, toast, categories, bankAccounts, users]);


   const handleAchieveGoal = useCallback(async ({ goal, actualCost, paymentCardId }: { goal: FinancialGoal; actualCost: number; paymentCardId?: string; }) => {
    if (!user || !firestore || !categories || !users) return;

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
            
            // Release blocked money and create expense for the saved portion
            for(const contribution of goal.contributions) {
                const contributionAccountRef = doc(familyDataRef, 'bankAccounts', contribution.bankAccountId);
                const contributionAccountDoc = await transaction.get(contributionAccountRef);
                if(contributionAccountDoc.exists()){
                    const accountData = contributionAccountDoc.data()!;
                    const newBlocked = (accountData.blockedBalance || 0) - contribution.amount;
                    const newBalance = accountData.balance - contribution.amount;
                    transaction.update(contributionAccountRef, { balance: newBalance, blockedBalance: newBlocked });

                    const expenseRef = doc(expensesRef);
                    transaction.set(expenseRef, {
                        id: expenseRef.id,
                        ownerId: accountData.ownerId,
                        registeredByUserId: user.uid,
                        amount: contribution.amount,
                        bankAccountId: contribution.bankAccountId,
                        categoryId: goalsCategoryId,
                        date: new Date().toISOString(),
                        description: `تحقق هدف (بخش پس‌انداز): ${goal.name}`,
                        type: 'expense' as const,
                        subType: 'goal_saved_portion' as const,
                        goalId: goal.id,
                        expenseFor: goal.ownerId,
                        balanceBefore: accountData.balance,
                        balanceAfter: newBalance,
                        createdAt: serverTimestamp(),
                    });
                }
            }


            // Handle cash portion if needed
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
                currentAmount: 0,
                contributions: [],
            });
        });

        toast({ title: "تبریک!", description: `هدف "${goal.name}" با موفقیت محقق شد.` });
        setAchievingGoal(null);
        
        const currentUserFirstName = users.find(u => u.id === user.uid)?.firstName || 'کاربر';
        const notificationDetails: TransactionDetails = {
            type: 'goal',
            title: `هدف محقق شد: ${goal.name}`,
            amount: actualCost,
            date: new Date().toISOString(),
            icon: 'Target',
            color: 'rgb(161 98 7)',
            registeredBy: currentUserFirstName,
            properties: [
                { label: 'هزینه نهایی', value: formatCurrency(actualCost, 'IRT') },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails, currentUserFirstName);


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
  }, [user, firestore, categories, users, toast]);


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
            
            if (expense.subType === 'goal_saved_portion') {
                accountRestorations[expense.bankAccountId].blocked += expense.amount;
            }
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
                   'blockedBalance': (accountData.blockedBalance || 0) + accountRestorations[accountId].blocked
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
            
            if (goalData.contributions && goalData.contributions.length > 0) {
                 for(const contribution of goalData.contributions) {
                    const accountRef = doc(familyDataRef, 'bankAccounts', contribution.bankAccountId);
                    const accountDoc = await transaction.get(accountRef);
                    if(accountDoc.exists()) {
                        const accountData = accountDoc.data()!;
                        const newBlockedBalance = (accountData.blockedBalance || 0) - contribution.amount;
                        transaction.update(accountRef, { blockedBalance: newBlockedBalance });
                    }
                }
            }

            transaction.delete(goalRef);
        });

        toast({ title: "موفقیت", description: "هدف مالی و مبالغ مسدود شده مرتبط با آن با موفقیت حذف شد." });
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

       <GoalForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingGoal}
          bankAccounts={bankAccounts || []}
          user={user}
        />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
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

      {/* Floating Action Button for Mobile */}
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
    </div>
  );
}
