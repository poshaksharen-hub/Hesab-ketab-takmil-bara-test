'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { ExpenseList } from '@/components/transactions/expense-list';
import { ExpenseForm } from '@/components/transactions/expense-form';
import type { Expense, BankAccount, Category, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function ExpensesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);

  const [allExpenses, setAllExpenses] = React.useState<Expense[]>([]);
  const [allBankAccounts, setAllBankAccounts] = React.useState<BankAccount[]>([]);
  const [allCategories, setAllCategories] = React.useState<Category[]>([]);
  const [allUsers, setAllUsers] = React.useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  React.useEffect(() => {
    if (!user || !firestore) return;
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const userProfiles = usersSnapshot.docs.map(doc => ({...doc.data(), id: doc.id } as UserProfile));
        const userIds = userProfiles.map(u => u.id);
        setAllUsers(userProfiles);

        const [expenseSnapshots, bankAccountSnapshots, categorySnapshots] = await Promise.all([
          Promise.all(userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'expenses')))),
          Promise.all(userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'bankAccounts')))),
          Promise.all(userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'categories'))))
        ]);

        const expenses = expenseSnapshots.flat().map(snap => snap.docs.map(doc => ({...doc.data(), id: doc.id} as Expense))).flat();
        const personalBankAccounts = bankAccountSnapshots.flat().map((snap, index) => snap.docs.map(doc => ({...doc.data(), id: doc.id, userId: userIds[index]} as BankAccount))).flat();
        const categories = categorySnapshots.flat().map(snap => snap.docs.map(doc => ({...doc.data(), id: doc.id} as Category))).flat();

        const sharedAccountsQuery = user.uid ? query(collection(firestore, 'shared', 'data', 'bankAccounts'), where(`members.${user.uid}`, '==', true)) : null;
        const sharedAccountsSnapshot = sharedAccountsQuery ? await getDocs(sharedAccountsQuery) : null;
        const sharedBankAccounts = sharedAccountsSnapshot ? sharedAccountsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id, isShared: true}) as BankAccount) : [];

        setAllExpenses(expenses);
        setAllBankAccounts([...personalBankAccounts, ...sharedBankAccounts]);
        setAllCategories(categories);
      } catch (error) {
        console.error("Failed to fetch expense page data:", error);
        toast({ variant: "destructive", title: "خطا در بارگذاری اطلاعات" });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [user, firestore, toast]);

  const handleFormSubmit = async (values: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'type' | 'registeredByUserId'>) => {
    if (!user || !firestore) return;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const expenseData = { ...values, type: 'expense' as 'expense' };
            const isSharedAccount = expenseData.bankAccountId.startsWith('shared-');
            const accountId = isSharedAccount ? expenseData.bankAccountId.replace('shared-', '') : expenseData.bankAccountId;
            
            const account = allBankAccounts.find(acc => acc.id === expenseData.bankAccountId);
            if (!account) throw new Error("کارت بانکی یافت نشد");

            const fromCardRef = doc(firestore, isSharedAccount ? `shared/data/bankAccounts/${accountId}` : `users/${account.userId}/bankAccounts/${accountId}`);
            const fromCardDoc = await transaction.get(fromCardRef);

            if (!fromCardDoc.exists()) {
                throw new Error("کارت بانکی مورد نظر یافت نشد.");
            }
            const fromCardData = fromCardDoc.data() as BankAccount;

            if (editingExpense) {
                // --- Edit Mode ---
                const oldExpenseRef = doc(firestore, 'users', editingExpense.userId, 'expenses', editingExpense.id);
                
                const isOldShared = editingExpense.bankAccountId.startsWith('shared-');
                const oldAccountId = isOldShared ? editingExpense.bankAccountId.replace('shared-', '') : editingExpense.bankAccountId;
                const oldAccount = allBankAccounts.find(acc => acc.id === editingExpense.bankAccountId);
                if(!oldAccount) throw new Error("کارت بانکی قدیمی یافت نشد.");
                
                const oldCardRef = doc(firestore, isOldShared ? `shared/data/bankAccounts/${oldAccountId}` : `users/${oldAccount.userId}/bankAccounts/${oldAccountId}`);

                // 1. Revert previous transaction
                if (editingExpense.bankAccountId === expenseData.bankAccountId) {
                    // Card is the same, just adjust balance
                    const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);
                    if (availableBalance + editingExpense.amount < expenseData.amount) {
                        throw new Error("موجودی حساب کافی نیست.");
                    }
                    const adjustedBalance = fromCardData.balance + editingExpense.amount - expenseData.amount;
                    transaction.update(fromCardRef, { balance: adjustedBalance });
                } else {
                    // Card has changed, revert old and apply new
                    const oldCardDoc = await transaction.get(oldCardRef);
                    if (oldCardDoc.exists()) {
                        const oldCardData = oldCardDoc.data() as BankAccount;
                        transaction.update(oldCardRef, { balance: oldCardData.balance + editingExpense.amount });
                    }
                    const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);
                    if (availableBalance < expenseData.amount) {
                         throw new Error("موجودی حساب جدید کافی نیست.");
                    }
                    transaction.update(fromCardRef, { balance: fromCardData.balance - expenseData.amount });
                }

                // 2. Update expense document
                transaction.update(oldExpenseRef, { ...expenseData, registeredByUserId: user.uid, updatedAt: serverTimestamp() });
                toast({ title: "موفقیت", description: "هزینه با موفقیت ویرایش شد." });

            } else {
                // --- Create Mode ---
                const availableBalance = fromCardData.balance - (fromCardData.blockedBalance || 0);
                if (availableBalance < expenseData.amount) {
                    throw new Error("موجودی حساب برای انجام این هزینه کافی نیست.");
                }
                // 1. Deduct from balance
                transaction.update(fromCardRef, { balance: fromCardData.balance - expenseData.amount });

                // 2. Create new expense document in the account owner's collection
                const expenseOwnerId = account.userId;
                const newExpenseRef = doc(collection(firestore, 'users', expenseOwnerId, 'expenses'));
                transaction.set(newExpenseRef, {
                    ...expenseData,
                    id: newExpenseRef.id,
                    userId: expenseOwnerId,
                    registeredByUserId: user.uid,
                    createdAt: serverTimestamp(),
                });
                toast({ title: "موفقیت", description: "هزینه جدید با موفقیت ثبت شد." });
            }
        });
        
        setIsFormOpen(false);
        setEditingExpense(null);

    } catch (error: any) {
        if (error instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', error);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در ثبت تراکنش",
            description: error.message || "مشکلی در ثبت هزینه پیش آمد.",
          });
        }
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!user || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const expenseRef = doc(firestore, 'users', expense.userId, 'expenses', expense.id);
            
            const isShared = expense.bankAccountId.startsWith('shared-');
            const accountId = isShared ? expense.bankAccountId.replace('shared-', '') : expense.bankAccountId;
            const account = allBankAccounts.find(acc => acc.id === expense.bankAccountId);
            if(!account) throw new Error("کارت بانکی یافت نشد");
            
            const cardRef = doc(firestore, isShared ? `shared/data/bankAccounts/${accountId}` : `users/${account.userId}/bankAccounts/${accountId}`);

            const cardDoc = await transaction.get(cardRef);
            if (cardDoc.exists()) {
                const cardData = cardDoc.data() as BankAccount;
                transaction.update(cardRef, { balance: cardData.balance + expense.amount });
            }
            
            transaction.delete(expenseRef);
        });
        toast({ title: "موفقیت", description: "هزینه با موفقیت حذف شد." });
    } catch (error: any) {
       if (error instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', error);
        } else {
          toast({
            variant: "destructive",
            title: "خطا در حذف هزینه",
            description: error.message || "مشکلی در حذف هزینه پیش آمد.",
          });
        }
    }
  };

  const handleEdit = (expense: Expense) => {
    if (expense.checkId || expense.loanPaymentId) {
        toast({
            variant: "destructive",
            title: "امکان ویرایش وجود ندارد",
            description: "این هزینه به صورت خودکار (بابت چک یا قسط وام) ثبت شده و قابل ویرایش نیست.",
        });
        return;
    }
    setEditingExpense(expense);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };
  
  const isLoading = isUserLoading || isLoadingData;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مدیریت هزینه‌ها
        </h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          ثبت هزینه جدید
        </Button>
      </div>

      {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : isFormOpen ? (
        <ExpenseForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingExpense}
          bankAccounts={allBankAccounts || []}
          categories={allCategories || []}
          user={user}
        />
      ) : (
        <ExpenseList
          expenses={allExpenses || []}
          bankAccounts={allBankAccounts || []}
          categories={allCategories || []}
          users={allUsers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
