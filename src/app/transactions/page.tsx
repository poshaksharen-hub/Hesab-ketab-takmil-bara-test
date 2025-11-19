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
      
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const userProfiles = usersSnapshot.docs.map(doc => ({...doc.data(), id: doc.id } as UserProfile));
      const userIds = userProfiles.map(u => u.id);
      setAllUsers(userProfiles);

      const expensePromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'expenses')));
      const bankAccountPromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'bankAccounts')));
      const categoryPromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'categories')));
      
      const [expenseSnapshots, bankAccountSnapshots, categorySnapshots] = await Promise.all([
        Promise.all(expensePromises),
        Promise.all(bankAccountPromises),
        Promise.all(categoryPromises)
      ]);

      const expenses = expenseSnapshots.flat().map(snap => snap.docs.map(doc => ({...doc.data(), id: doc.id} as Expense))).flat();
      const personalBankAccounts = bankAccountSnapshots.flat().map((snap, index) => snap.docs.map(doc => ({...doc.data(), id: doc.id, userId: userIds[index]} as BankAccount))).flat();
      const categories = categorySnapshots.flat().map(snap => snap.docs.map(doc => ({...doc.data(), id: doc.id} as Category))).flat();

      const sharedAccountsQuery = query(collection(firestore, 'shared', 'data', 'bankAccounts'), where(`members.${user.uid}`, '==', true));
      const sharedAccountsSnapshot = await getDocs(sharedAccountsQuery);
      const sharedBankAccounts = sharedAccountsSnapshot.docs.map(doc => ({...doc.data(), id: `shared-${doc.id}`, isShared: true}) as BankAccount);

      setAllExpenses(expenses);
      setAllBankAccounts([...personalBankAccounts, ...sharedBankAccounts]);
      setAllCategories(categories);
      setIsLoadingData(false);
    };

    fetchData();
  }, [user, firestore]);

  const handleFormSubmit = async (values: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'type' | 'registeredByUserId'>) => {
    if (!user || !firestore) return;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const expenseData = { ...values, type: 'expense' as 'expense' };
            const isSharedAccount = expenseData.bankAccountId.startsWith('shared-');
            const accountId = isSharedAccount ? expenseData.bankAccountId.replace('shared-', '') : expenseData.bankAccountId;
            
            let ownerId = '';
            if(isSharedAccount){
               ownerId = user.uid; // Not really an owner, but needed for path
            } else {
                 const account = allBankAccounts.find(acc => acc.id === accountId);
                 if(!account) throw new Error("کارت بانکی یافت نشد");
                 ownerId = account.userId;
            }

            const fromCardRef = doc(firestore, isSharedAccount ? `shared/data/bankAccounts/${accountId}` : `users/${ownerId}/bankAccounts/${accountId}`);
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
                let oldOwnerId = '';
                 if(isOldShared) {
                    oldOwnerId = user.uid;
                } else {
                    const oldAccount = allBankAccounts.find(acc => acc.id === oldAccountId);
                    if(!oldAccount) throw new Error("کارت بانکی قدیمی یافت نشد.");
                    oldOwnerId = oldAccount.userId;
                }
                const oldCardRef = doc(firestore, isOldShared ? `shared/data/bankAccounts/${oldAccountId}` : `users/${oldOwnerId}/bankAccounts/${oldAccountId}`);

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
                const expenseOwnerId = ownerId;
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
        console.error("Transaction Error: ", error);
        toast({
            variant: "destructive",
            title: "خطا در ثبت تراکنش",
            description: error.message || "مشکلی در ثبت هزینه پیش آمد.",
        });
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!user || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const expenseRef = doc(firestore, 'users', expense.userId, 'expenses', expense.id);
            
            const isShared = expense.bankAccountId.startsWith('shared-');
            const accountId = isShared ? expense.bankAccountId.replace('shared-', '') : expense.bankAccountId;
            let ownerId = '';
            if(isShared){
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
                transaction.update(cardRef, { balance: cardData.balance + expense.amount });
            }
            
            transaction.delete(expenseRef);
        });
        toast({ title: "موفقیت", description: "هزینه با موفقیت حذف شد." });
    } catch (error: any) {
        console.error("Delete Error:", error);
        toast({
            variant: "destructive",
            title: "خطا در حذف هزینه",
            description: error.message || "مشکلی در حذف هزینه پیش آمد.",
        });
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
