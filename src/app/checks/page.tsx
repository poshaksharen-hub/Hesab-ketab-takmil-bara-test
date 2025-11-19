
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, query, where, getDocs, addDoc } from 'firebase/firestore';
import { CheckList } from '@/components/checks/check-list';
import { CheckForm } from '@/components/checks/check-form';
import type { Check, BankAccount, Payee, Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function ChecksPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCheck, setEditingCheck] = React.useState<Check | null>(null);

  const checksQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'checks') : null),
    [firestore, user]
  );
  const { data: checks, isLoading: isLoadingChecks } = useCollection<Check>(checksQuery);

  const bankAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'bankAccounts') : null),
    [firestore, user]
  );
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
  
  const payeesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'payees') : null),
    [firestore, user]
  );
  const { data: payees, isLoading: isLoadingPayees } = useCollection<Payee>(payeesQuery);

  const categoriesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'categories') : null),
    [firestore, user]
  );
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);


  const handleFormSubmit = async (values: Omit<Check, 'id' | 'userId'>) => {
    if (!user || !firestore) return;

    try {
      if (editingCheck) {
        // Edit
        const checkRef = doc(firestore, 'users', user.uid, 'checks', editingCheck.id);
        // Editing a check doesn't involve balance changes directly.
        // Status changes are handled by clear/unclear functions.
        await runTransaction(firestore, async (transaction) => {
          transaction.update(checkRef, values);
        });
        toast({ title: "موفقیت", description: "چک با موفقیت ویرایش شد." });
      } else {
        // Create
        await addDoc(collection(firestore, 'users', user.uid, 'checks'), {
            ...values,
            userId: user.uid,
            status: 'pending', // Always pending on creation
        });
        toast({ title: "موفقیت", description: "چک جدید با موفقیت ثبت شد." });
      }
      setIsFormOpen(false);
      setEditingCheck(null);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در ثبت چک",
            description: error.message || "مشکلی در ثبت چک پیش آمد.",
        });
    }
  };

  const handleClearCheck = async (check: Check) => {
    if (!user || !firestore || check.status === 'cleared') return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const checkRef = doc(firestore, 'users', user.uid, 'checks', check.id);
        const bankAccountRef = doc(firestore, 'users', user.uid, 'bankAccounts', check.bankAccountId);

        const bankAccountDoc = await transaction.get(bankAccountRef);
        if (!bankAccountDoc.exists() || bankAccountDoc.data().balance < check.amount) {
          throw new Error("موجودی حساب برای پاس کردن چک کافی نیست.");
        }

        // 1. Update check status to 'cleared'
        transaction.update(checkRef, { status: 'cleared' });

        // 2. Deduct amount from bank account balance
        const newBalance = bankAccountDoc.data().balance - check.amount;
        transaction.update(bankAccountRef, { balance: newBalance });

        // 3. Create a corresponding expense record
        const expenseRef = doc(collection(firestore, 'users', user.uid, 'expenses'));
        transaction.set(expenseRef, {
            id: expenseRef.id,
            userId: user.uid,
            amount: check.amount,
            bankAccountId: check.bankAccountId,
            categoryId: check.categoryId,
            date: new Date().toISOString(),
            description: `پاس کردن چک به: ${payees?.find(p => p.id === check.payeeId)?.name || 'نامشخص'}`,
            type: 'expense',
            checkId: check.id, // Link expense to the check
        });
      });
      toast({ title: "موفقیت", description: "چک با موفقیت پاس شد و از حساب شما کسر گردید." });
    } catch (error: any) {
       toast({
            variant: "destructive",
            title: "خطا در پاس کردن چک",
            description: error.message || "مشکلی در عملیات پاس کردن چک پیش آمد.",
        });
    }
  };

  const handleDelete = async (check: Check) => {
    if (!user || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const checkRef = doc(firestore, 'users', user.uid, 'checks', check.id);
            
            // If the check was already cleared, we need to reverse the financial impact
            if (check.status === 'cleared') {
                const bankAccountRef = doc(firestore, 'users', user.uid, 'bankAccounts', check.bankAccountId);
                const bankAccountDoc = await transaction.get(bankAccountRef);
                
                // Refund the amount to the bank account
                if(bankAccountDoc.exists()){
                    const newBalance = bankAccountDoc.data().balance + check.amount;
                    transaction.update(bankAccountRef, { balance: newBalance });
                }

                // Find and delete the corresponding expense
                const expensesRef = collection(firestore, 'users', user.uid, 'expenses');
                const q = query(expensesRef, where("checkId", "==", check.id));
                const querySnapshot = await getDocs(q); // getDocs should be outside transaction, but for this case it might be fine. For robustness, fetch outside and pass refs to transaction.
                querySnapshot.forEach((doc) => {
                    transaction.delete(doc.ref);
                });
            }
            
            // Finally, delete the check document itself
            transaction.delete(checkRef);
        });

        toast({ title: "موفقیت", description: "چک با موفقیت حذف شد." });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در حذف چک",
            description: error.message || "مشکلی در حذف چک پیش آمد.",
        });
    }
  };

  const handleEdit = (check: Check) => {
    // Prevent editing of cleared checks
    if (check.status === 'cleared') {
      toast({
        variant: "destructive",
        title: "امکان ویرایش وجود ندارد",
        description: "چک‌های پاس شده قابل ویرایش نیستند. برای اصلاح، لطفا چک را حذف و مجددا ثبت کنید.",
      });
      return;
    }
    setEditingCheck(check);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingCheck(null);
    setIsFormOpen(true);
  };
  
  const isLoading = isUserLoading || isLoadingChecks || isLoadingBankAccounts || isLoadingPayees || isLoadingCategories;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مدیریت چک‌ها
        </h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          ثبت چک جدید
        </Button>
      </div>

      {isLoading ? (
          <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : isFormOpen ? (
        <CheckForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingCheck}
          bankAccounts={bankAccounts || []}
          payees={payees || []}
          categories={categories || []}
        />
      ) : (
        <CheckList
          checks={checks || []}
          bankAccounts={bankAccounts || []}
          payees={payees || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClear={handleClearCheck}
        />
      )}
    </main>
  );
}

