
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, addDoc, serverTimestamp, query, where, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import type { FinancialGoal, BankAccount, Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { GoalForm } from '@/components/goals/goal-form';
import { GoalList } from '@/components/goals/goal-list';
import { AchieveGoalDialog } from '@/components/goals/achieve-goal-dialog';

export default function GoalsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [achievingGoal, setAchievingGoal] = useState<FinancialGoal | null>(null);

  const goalsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'financialGoals') : null),
    [firestore, user]
  );
  const { data: goals, isLoading: isLoadingGoals } = useCollection<FinancialGoal>(goalsQuery);

  const bankAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'bankAccounts') : null),
    [firestore, user]
  );
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
  
  const categoriesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'categories') : null),
    [firestore, user]
  );
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);


  const handleFormSubmit = async (values: Omit<FinancialGoal, 'id' | 'userId' | 'isAchieved' | 'currentAmount'>) => {
    if (!user || !firestore) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const { savedAmount: newSavedAmount, savedFromBankAccountId: newCardId, ...goalData } = values;
        
        // --- Edit Mode ---
        if (editingGoal) {
          const goalRef = doc(firestore, 'users', user.uid, 'financialGoals', editingGoal.id);
          const oldSavedAmount = editingGoal.savedAmount || 0;
          const oldCardId = editingGoal.savedFromBankAccountId;

          // 1. Revert previous blocked amount if card or amount changed
          if (oldCardId && (oldCardId !== newCardId || oldSavedAmount !== newSavedAmount)) {
            const oldCardRef = doc(firestore, 'users', user.uid, 'bankAccounts', oldCardId);
            const oldCardDoc = await transaction.get(oldCardRef);
            if (oldCardDoc.exists()) {
              const oldCardData = oldCardDoc.data() as BankAccount;
              transaction.update(oldCardRef, { blockedBalance: (oldCardData.blockedBalance || 0) - oldSavedAmount });
            }
          }
          
          // 2. Apply new blocked amount
          if (newCardId && newSavedAmount && newSavedAmount > 0) {
            const newCardRef = doc(firestore, 'users', user.uid, 'bankAccounts', newCardId);
            const newCardDoc = await transaction.get(newCardRef);
            if (!newCardDoc.exists()) throw new Error("کارت بانکی انتخاب شده یافت نشد.");
            
            const newCardData = newCardDoc.data() as BankAccount;
            const alreadyBlockedOnThisCard = oldCardId === newCardId ? oldSavedAmount : 0;
            const availableBalance = newCardData.balance - (newCardData.blockedBalance || 0) + alreadyBlockedOnThisCard;

            if (availableBalance < newSavedAmount) {
                throw new Error("موجودی قابل استفاده کارت برای مسدود کردن این مبلغ کافی نیست.");
            }
            transaction.update(newCardRef, { blockedBalance: (newCardData.blockedBalance || 0) - alreadyBlockedOnThisCard + newSavedAmount });
          }

          // 3. Update goal document
          transaction.update(goalRef, { ...goalData, savedAmount: newSavedAmount || 0, savedFromBankAccountId: newCardId || '' });
          toast({ title: "موفقیت", description: "هدف مالی با موفقیت ویرایش شد." });

        } else {
          // --- Create Mode ---
          if (newCardId && newSavedAmount && newSavedAmount > 0) {
            const cardRef = doc(firestore, 'users', user.uid, 'bankAccounts', newCardId);
            const cardDoc = await transaction.get(cardRef);
            if (!cardDoc.exists()) throw new Error("کارت بانکی انتخاب شده یافت نشد.");

            const cardData = cardDoc.data() as BankAccount;
            if (cardData.balance - (cardData.blockedBalance || 0) < newSavedAmount) {
              throw new Error("موجودی قابل استفاده کارت برای مسدود کردن این مبلغ کافی نیست.");
            }
            transaction.update(cardRef, { blockedBalance: (cardData.blockedBalance || 0) + newSavedAmount });
          }
          
          const newGoalRef = doc(collection(firestore, 'users', user.uid, 'financialGoals'));
          transaction.set(newGoalRef, {
            ...goalData,
            id: newGoalRef.id,
            userId: user.uid,
            isAchieved: false,
            currentAmount: newSavedAmount || 0,
            savedAmount: newSavedAmount || 0,
            savedFromBankAccountId: newCardId || '',
          });
          toast({ title: "موفقیت", description: "هدف مالی جدید با موفقیت اضافه شد." });
        }
      });

      setIsFormOpen(false);
      setEditingGoal(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطا در ثبت هدف", description: error.message });
    }
  };

  const handleAchieveGoalSubmit = async ({ paymentAmount, paymentCardId, categoryId }: { paymentAmount: number; paymentCardId: string; categoryId: string }) => {
    if (!user || !firestore || !achievingGoal) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const goalRef = doc(firestore, 'users', user.uid, 'financialGoals', achievingGoal.id);
            const savedAmount = achievingGoal.savedAmount || 0;
            const savedFromCardId = achievingGoal.savedFromBankAccountId;
            
            // 1. Update balances
            if (savedFromCardId && savedAmount > 0) {
                const savedFromCardRef = doc(firestore, 'users', user.uid, 'bankAccounts', savedFromCardId);
                const cardDoc = await transaction.get(savedFromCardRef);
                if(cardDoc.exists()){
                    const cardData = cardDoc.data() as BankAccount;
                    transaction.update(savedFromCardRef, {
                        balance: cardData.balance - savedAmount,
                        blockedBalance: (cardData.blockedBalance || 0) - savedAmount
                    });
                }
            }

            if (paymentAmount > 0) {
                const paymentCardRef = doc(firestore, 'users', user.uid, 'bankAccounts', paymentCardId);
                const cardDoc = await transaction.get(paymentCardRef);
                if(!cardDoc.exists()) throw new Error("کارت پرداخت یافت نشد.");
                const cardData = cardDoc.data() as BankAccount;
                if(cardData.balance - (cardData.blockedBalance || 0) < paymentAmount) throw new Error("موجودی کارت پرداخت کافی نیست.");
                transaction.update(paymentCardRef, { balance: cardData.balance - paymentAmount });
            }

            // 2. Create corresponding expense
            const newExpenseRef = doc(collection(firestore, 'users', user.uid, 'expenses'));
            transaction.set(newExpenseRef, {
                id: newExpenseRef.id,
                userId: user.uid,
                bankAccountId: paymentCardId, // or decide how to represent multi-card payment
                categoryId: categoryId,
                amount: achievingGoal.targetAmount,
                date: new Date().toISOString(),
                description: `تحقق هدف: ${achievingGoal.name}`,
                type: 'expense',
                goalId: achievingGoal.id, // Link expense to the goal
                createdAt: serverTimestamp(),
            });

            // 3. Update goal status
            transaction.update(goalRef, { isAchieved: true, currentAmount: achievingGoal.targetAmount });
        });

        toast({ title: "تبریک!", description: "هدف شما با موفقیت محقق شد." });
        setAchievingGoal(null);

    } catch (error: any) {
        toast({ variant: "destructive", title: "خطا در تحقق هدف", description: error.message });
    }
  };
  
  const handleRevert = async (goal: FinancialGoal) => {
    if (!user || !firestore) return;
    try {
        const batch = writeBatch(firestore);

        // Find and delete the corresponding expense
        const expensesRef = collection(firestore, 'users', user.uid, 'expenses');
        const q = query(expensesRef, where("goalId", "==", goal.id));
        const querySnapshot = await getDocs(q);

        let expenseAmount = 0;
        let expenseCardId = '';
        
        querySnapshot.forEach((doc) => {
            const expenseData = doc.data();
            expenseAmount = expenseData.amount;
            expenseCardId = expenseData.bankAccountId;
            batch.delete(doc.ref);
        });

        if (expenseAmount > 0 && expenseCardId) {
             const finalPaymentAmount = expenseAmount - (goal.savedAmount || 0);
             if(finalPaymentAmount > 0){
                const paymentCardRef = doc(firestore, 'users', user.uid, 'bankAccounts', expenseCardId);
                batch.update(paymentCardRef, { balance: serverTimestamp.prototype.constructor.increment(finalPaymentAmount) });
             }
        }
       
        // Restore blocked balance and main balance
        if(goal.savedFromBankAccountId && goal.savedAmount) {
             const savedFromCardRef = doc(firestore, 'users', user.uid, 'bankAccounts', goal.savedFromBankAccountId);
             batch.update(savedFromCardRef, { 
                balance: serverTimestamp.prototype.constructor.increment(goal.savedAmount),
                blockedBalance: serverTimestamp.prototype.constructor.increment(goal.savedAmount)
             });
        }
        
        // Revert goal status
        const goalRef = doc(firestore, 'users', user.uid, 'financialGoals', goal.id);
        batch.update(goalRef, { isAchieved: false });
        
        await batch.commit();

        toast({ title: "موفقیت", description: "هدف با موفقیت بازگردانی شد." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "خطا در بازگردانی", description: error.message || 'مشکلی در عملیات پیش آمد.' });
    }
};

  const handleDelete = async (goal: FinancialGoal) => {
    if (!user || !firestore) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const goalRef = doc(firestore, 'users', user.uid, 'financialGoals', goal.id);
            if (goal.savedAmount && goal.savedFromBankAccountId) {
                const cardRef = doc(firestore, 'users', user.uid, 'bankAccounts', goal.savedFromBankAccountId);
                const cardDoc = await transaction.get(cardRef);
                if(cardDoc.exists()){
                    const cardData = cardDoc.data() as BankAccount;
                    transaction.update(cardRef, { blockedBalance: (cardData.blockedBalance || 0) - goal.savedAmount });
                }
            }
            transaction.delete(goalRef);
        });
        toast({ title: "موفقیت", description: "هدف مالی با موفقیت حذف شد." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "خطا در حذف", description: error.message });
    }
  };


  const handleAddNew = () => {
    setEditingGoal(null);
    setIsFormOpen(true);
  };

  const handleEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };
  
  const isLoading = isUserLoading || isLoadingGoals || isLoadingBankAccounts || isLoadingCategories;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">اهداف مالی (خواسته‌ها)</h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          افزودن هدف جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                onAchieve={setAchievingGoal}
                onRevert={handleRevert}
            />
            {achievingGoal && (
                <AchieveGoalDialog
                    goal={achievingGoal}
                    bankAccounts={bankAccounts || []}
                    categories={categories || []}
                    isOpen={!!achievingGoal}
                    onOpenChange={() => setAchievingGoal(null)}
                    onSubmit={handleAchieveGoalSubmit}
                />
            )}
        </>
      )}
    </main>
  );
}
