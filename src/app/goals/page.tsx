
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
} from 'firebase/firestore';
import type { FinancialGoal, BankAccount, Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GoalList } from '@/components/goals/goal-list';
import { GoalForm } from '@/components/goals/goal-form';
import { AchieveGoalDialog } from '@/components/goals/achieve-goal-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';

const FAMILY_DATA_DOC = 'shared-data';

export default function GoalsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [achievingGoal, setAchievingGoal] = useState<FinancialGoal | null>(null);

  const { goals, bankAccounts, categories } = allData;

  const handleFormSubmit = useCallback(async (values: any) => {
    if (!user || !firestore) return;
    const { savedAmount = 0, savedFromBankAccountId, ...goalData } = values;

    try {
      await runTransaction(firestore, async (transaction) => {
        const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
        
        // --- ALL READS MUST HAPPEN BEFORE ALL WRITES ---

        // Reads for both Edit and Create
        let newAccountDoc = null;
        if (savedFromBankAccountId && savedAmount > 0) {
            const newAccountRef = doc(familyDataRef, 'bankAccounts', savedFromBankAccountId);
            newAccountDoc = await transaction.get(newAccountRef);
            if (!newAccountDoc.exists()) throw new Error("حساب بانکی جدید انتخاب شده برای پس‌انداز یافت نشد.");
        }

        // Reads for Edit mode
        let oldAccountDoc = null;
        let originalBlockedAmount = 0;
        let originalSavedAccountId: string | null = null;
        
        if (editingGoal) {
            originalBlockedAmount = editingGoal.savedAmount || 0;
            originalSavedAccountId = editingGoal.savedFromBankAccountId || null;
            if (originalSavedAccountId) {
                const oldAccountRef = doc(familyDataRef, 'bankAccounts', originalSavedAccountId);
                oldAccountDoc = await transaction.get(oldAccountRef);
                if (!oldAccountDoc.exists()) throw new Error("حساب بانکی قبلی هدف یافت نشد.");
            }
        }
        
        // --- ALL WRITES START FROM HERE ---

        if (editingGoal) {
            // --- EDIT MODE WRITES ---
            const goalRef = doc(familyDataRef, 'financialGoals', editingGoal.id);
            transaction.update(goalRef, {
                ...goalData,
                currentAmount: savedAmount,
                savedAmount: savedAmount,
                savedFromBankAccountId: savedFromBankAccountId || null,
            });

            // Logic to adjust blocked balances
            const isSameAccount = originalSavedAccountId === savedFromBankAccountId;

            if (isSameAccount && originalSavedAccountId && oldAccountDoc) {
                // Account is the same, just adjust the balance
                const oldBlocked = oldAccountDoc.data()!.blockedBalance || 0;
                const newBlocked = oldBlocked - originalBlockedAmount + savedAmount;
                transaction.update(oldAccountDoc.ref, { blockedBalance: newBlocked });
            } else {
                // Accounts are different, or one of them is new/removed
                // 1. Revert old account's blocked balance
                if (originalSavedAccountId && oldAccountDoc) {
                    const oldBlocked = oldAccountDoc.data()!.blockedBalance || 0;
                    transaction.update(oldAccountDoc.ref, { blockedBalance: oldBlocked - originalBlockedAmount });
                }
                // 2. Add to new account's blocked balance
                if (savedFromBankAccountId && newAccountDoc) {
                    const currentBlocked = newAccountDoc.data()!.blockedBalance || 0;
                    transaction.update(newAccountDoc.ref, { blockedBalance: currentBlocked + savedAmount });
                }
            }
        } else {
            // --- CREATE MODE WRITES ---
            if (newAccountDoc) {
                const newAccountData = newAccountDoc.data()!;
                const availableBalance = newAccountData.balance - (newAccountData.blockedBalance || 0);
                if (availableBalance < savedAmount) throw new Error("موجودی حساب برای مسدود کردن مبلغ کافی نیست.");
                
                // Update new account's blocked balance
                transaction.update(newAccountDoc.ref, { blockedBalance: (newAccountData.blockedBalance || 0) + savedAmount });
            }

            // Create the new goal document
            const newGoalRef = doc(collection(familyDataRef, 'financialGoals'));
            transaction.set(newGoalRef, {
                ...goalData,
                id: newGoalRef.id,
                registeredByUserId: user.uid,
                isAchieved: false,
                currentAmount: savedAmount,
                savedAmount: savedAmount,
                savedFromBankAccountId: savedFromBankAccountId || null,
            });
        }
      });

      toast({
        title: 'موفقیت',
        description: `هدف مالی با موفقیت ${editingGoal ? 'ویرایش' : 'ذخیره'} شد.`,
      });
      setIsFormOpen(false);
      setEditingGoal(null);

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
  }, [user, firestore, editingGoal, toast]);

   const handleAchieveGoal = useCallback(async ({ paymentAmount, paymentCardId, categoryId }: { paymentAmount: number; paymentCardId: string; categoryId: string }) => {
    if (!user || !firestore || !achievingGoal) return;
    const goal = achievingGoal;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const goalRef = doc(familyDataRef, 'financialGoals', goal.id);

            // --- READS ---
            let savedFromAccountDoc = null;
            if (goal.savedFromBankAccountId && goal.savedAmount) {
                const savedFromAccountRef = doc(familyDataRef, 'bankAccounts', goal.savedFromBankAccountId);
                savedFromAccountDoc = await transaction.get(savedFromAccountRef);
                if (!savedFromAccountDoc.exists()) throw new Error("حساب پس‌انداز اولیه یافت نشد.");
            }
            
            let paymentAccountDoc = null;
            if (paymentAmount > 0 && paymentCardId) {
                 const paymentAccountRef = doc(familyDataRef, 'bankAccounts', paymentCardId);
                 paymentAccountDoc = await transaction.get(paymentAccountRef);
                 if (!paymentAccountDoc.exists()) throw new Error("کارت پرداخت یافت نشد.");
                 const availableBalance = paymentAccountDoc.data()!.balance - (paymentAccountDoc.data()!.blockedBalance || 0);
                 if(availableBalance < paymentAmount) throw new Error("موجودی کارت پرداخت کافی نیست.");
            }

            // --- WRITES ---

            // 1. Unblock the saved amount and create the expense
            const expenseRef = doc(collection(familyDataRef, 'expenses'));
            transaction.set(expenseRef, {
                id: expenseRef.id,
                ownerId: 'shared', // Goals are shared expenses
                registeredByUserId: user.uid,
                amount: goal.targetAmount,
                bankAccountId: paymentCardId || goal.savedFromBankAccountId, // Fallback if no payment card needed
                categoryId: categoryId,
                date: new Date().toISOString(),
                description: `تحقق هدف: ${goal.name}`,
                type: 'expense',
                goalId: goal.id,
            });

            // 2. Unblock the saved amount from the source account
            if (savedFromAccountDoc) {
                const savedFromAccountData = savedFromAccountDoc.data()!;
                transaction.update(savedFromAccountDoc.ref, { 
                    blockedBalance: (savedFromAccountData.blockedBalance || 0) - goal.savedAmount!,
                });
            }
            
            // 3. Deduct the remaining payment from the payment card
            if (paymentAccountDoc) {
                 transaction.update(paymentAccountDoc.ref, { 
                    balance: paymentAccountDoc.data()!.balance - paymentAmount 
                 });
            }

            // 4. Mark the goal as achieved
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

      if (goal.savedFromBankAccountId && goal.savedAmount) {
          const savedAccountRef = doc(familyDataRef, 'bankAccounts', goal.savedFromBankAccountId);
          // We need the current account data to correctly revert
          const savedAccountDoc = await getDocs(query(collection(familyDataRef, 'bankAccounts'), where('id', '==', goal.savedFromBankAccountId)));
          if(!savedAccountDoc.empty) {
             const accountData = savedAccountDoc.docs[0].data();
             batch.update(savedAccountRef, { 'blockedBalance': (accountData.blockedBalance || 0) + goal.savedAmount });
          }
      }

      if (associatedExpense) {
          const paymentAmount = associatedExpense.amount - (goal.savedAmount || 0);
          if (paymentAmount > 0 && associatedExpense.bankAccountId) {
              const paymentAccountRef = doc(familyDataRef, 'bankAccounts', associatedExpense.bankAccountId);
              // We need current account data to revert correctly
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

  const handleDelete = useCallback(async (goal: FinancialGoal) => {
    if (!user || !firestore) return;
    const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
    const goalRef = doc(familyDataRef, 'financialGoals', goal.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            if (goal.isAchieved) {
                throw new Error("امکان حذف هدف محقق شده وجود ندارد. ابتدا آن را بازگردانی کنید.");
            }
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
                description: error.message || 'مشکلی در حذف هدف پیش آمد.',
            });
        }
    }
  }, [user, firestore, toast]);

  const handleAddNew = useCallback(() => {
    setEditingGoal(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  }, []);

  const handleOpenAchieveDialog = useCallback((goal: FinancialGoal) => {
    setAchievingGoal(goal);
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

    