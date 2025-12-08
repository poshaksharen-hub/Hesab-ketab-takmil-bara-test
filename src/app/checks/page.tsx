
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, query, where, getDocs, addDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { CheckList } from '@/components/checks/check-list';
import { CheckForm } from '@/components/checks/check-form';
import type { Check, BankAccount, Payee, Category, Expense, TransactionDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';

const FAMILY_DATA_DOC = 'shared-data';


export default function ChecksPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCheck, setEditingCheck] = React.useState<Check | null>(null);
  
  const { checks, bankAccounts, payees, categories } = allData;

  const handleFormSubmit = React.useCallback(async (values: Omit<Check, 'id' | 'registeredByUserId' | 'status' | 'issueDate' | 'dueDate'> & {issueDate: Date, dueDate: Date}) => {
    if (!user || !firestore) return;

    const checksColRef = collection(firestore, 'family-data', FAMILY_DATA_DOC, 'checks');
    const bankAccount = bankAccounts.find(acc => acc.id === values.bankAccountId);

    if (!bankAccount) {
        toast({ variant: 'destructive', title: "خطا", description: "حساب بانکی انتخاب شده یافت نشد." });
        return;
    }


    if (editingCheck) {
      const checkRef = doc(checksColRef, editingCheck.id);
      const updatedCheck = {
        ...values,
        issueDate: values.issueDate.toISOString(),
        dueDate: values.dueDate.toISOString(),
        ownerId: bankAccount.ownerId // Automatically set ownerId from bank account
      }
      updateDoc(checkRef, updatedCheck)
        .then(() => {
          toast({ title: "موفقیت", description: "چک با موفقیت ویرایش شد." });
        })
        .catch(async (serverError) => {
            throw new FirestorePermissionError({
                path: checkRef.path,
                operation: 'update',
                requestResourceData: updatedCheck,
            });
        });
    } else {
      const newCheckData = {
        ...values,
        issueDate: values.issueDate.toISOString(),
        dueDate: values.dueDate.toISOString(),
        registeredByUserId: user.uid,
        status: 'pending' as 'pending',
        ownerId: bankAccount.ownerId, // Automatically set ownerId from bank account
      };
      
      try {
        const docRef = await addDoc(checksColRef, newCheckData);
        await updateDoc(docRef, { id: docRef.id });
        
        toast({ title: "موفقیت", description: "چک جدید با موفقیت ثبت شد." });

        const payeeName = payees.find(p => p.id === values.payeeId)?.name;
        const categoryName = categories.find(c => c.id === values.categoryId)?.name;

        const notificationDetails: TransactionDetails = {
            type: 'check',
            title: `ثبت چک جدید برای ${payeeName}`,
            amount: values.amount,
            date: newCheckData.dueDate,
            icon: 'BookCopy',
            color: 'rgb(217 119 6)',
            properties: [
                { label: 'شرح', value: values.description || '-' },
                { label: 'از حساب', value: bankAccount.bankName },
                { label: 'بابت', value: categoryName },
            ]
        };
        await sendSystemNotification(firestore, user.uid, notificationDetails);
        
      } catch (error) {
           throw new FirestorePermissionError({
                path: checksColRef.path,
                operation: 'create',
                requestResourceData: newCheckData,
            });
      }
    }
    setIsFormOpen(false);
    setEditingCheck(null);
  }, [user, firestore, editingCheck, toast, bankAccounts, payees, categories]);

  const handleClearCheck = React.useCallback(async (check: Check) => {
    if (!user || !firestore || check.status === 'cleared') return;
    
    const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
    const checkRef = doc(familyDataRef, 'checks', check.id);
    
    const account = bankAccounts.find(acc => acc.id === check.bankAccountId);
    if (!account) {
        toast({ variant: 'destructive', title: "خطا", description: "حساب بانکی چک یافت نشد." });
        return;
    }
    const bankAccountRef = doc(familyDataRef, 'bankAccounts', account.id);
    const expensesColRef = collection(familyDataRef, 'expenses');
    const payeeName = payees?.find(p => p.id === check.payeeId)?.name || 'نامشخص';

    try {
      await runTransaction(firestore, async (transaction) => {
        const bankAccountDoc = await transaction.get(bankAccountRef);
        if (!bankAccountDoc.exists()) throw new Error("حساب بانکی یافت نشد.");

        const bankAccountData = bankAccountDoc.data()!;
        const availableBalance = bankAccountData.balance - (bankAccountData.blockedBalance || 0);

        if (availableBalance < check.amount) {
          throw new Error("موجودی قابل استفاده حساب برای پاس کردن چک کافی نیست.");
        }

        const clearedDate = new Date().toISOString();
        const balanceBefore = bankAccountData.balance;
        const balanceAfter = balanceBefore - check.amount;

        // Update check status and cleared date
        transaction.update(checkRef, { status: 'cleared', clearedDate });
        
        // Update bank account balance
        transaction.update(bankAccountRef, { balance: balanceAfter });
        
        // Create a detailed description for the expense
        const expenseDescription = `پاس کردن چک به: ${payeeName}`;


        // Create the corresponding expense
        const expenseRef = doc(expensesColRef);
        transaction.set(expenseRef, {
            id: expenseRef.id,
            ownerId: account.ownerId,
            registeredByUserId: user.uid,
            amount: check.amount,
            bankAccountId: check.bankAccountId,
            categoryId: check.categoryId,
            payeeId: check.payeeId,
            date: clearedDate,
            description: expenseDescription,
            type: 'expense',
            checkId: check.id,
            expenseFor: check.expenseFor,
            createdAt: serverTimestamp(),
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
        });
      });
      toast({ title: "موفقیت", description: "چک با موفقیت پاس شد و از حساب شما کسر گردید." });

      const categoryName = categories.find(c => c.id === check.categoryId)?.name;
      const notificationDetails: TransactionDetails = {
            type: 'payment',
            title: `چک پاس شد: ${payeeName}`,
            amount: check.amount,
            date: new Date().toISOString(),
            icon: 'CheckCircle',
            color: 'rgb(22 163 74)',
            properties: [
                { label: 'شرح', value: check.description || '-' },
                { label: 'از حساب', value: account.bankName },
                { label: 'بابت', value: categoryName },
            ]
        };
      await sendSystemNotification(firestore, user.uid, notificationDetails);


    } catch (error: any) {
       if (error.name === 'FirebaseError') {
            throw new FirestorePermissionError({
                path: checkRef.path, // Simplified path for the transaction
                operation: 'write', 
            });
       } else {
            toast({
                variant: "destructive",
                title: "خطا در پاس کردن چک",
                description: error.message || "مشکلی در عملیات پاس کردن چک پیش آمد.",
            });
       }
    }
  }, [user, firestore, bankAccounts, payees, toast, categories]);
  
  const handleDeleteCheck = React.useCallback(async (check: Check) => {
    if (!user || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            const checkRef = doc(familyDataRef, 'checks', check.id);
            
            // If the check was cleared, we need to reverse the financial impact
            if (check.status === 'cleared') {
                const expenseQuery = query(collection(familyDataRef, 'expenses'), where('checkId', '==', check.id));
                const expenseSnapshot = await getDocs(expenseQuery);
                
                if (!expenseSnapshot.empty) {
                    const expenseDoc = expenseSnapshot.docs[0];
                    const expenseData = expenseDoc.data() as Expense;
                    
                    const accountRef = doc(familyDataRef, 'bankAccounts', expenseData.bankAccountId);
                    const accountDoc = await transaction.get(accountRef);
                    
                    if (accountDoc.exists()) {
                        const accountData = accountDoc.data() as BankAccount;
                        transaction.update(accountRef, { balance: accountData.balance + expenseData.amount });
                    }
                    
                    transaction.delete(expenseDoc.ref);
                }
            }
            
            // Finally, delete the check itself
            transaction.delete(checkRef);
        });

        toast({ title: "موفقیت", description: "چک و سوابق مالی مرتبط (در صورت وجود) با موفقیت حذف شد." });
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             throw new FirestorePermissionError({
                path: `family-data/${FAMILY_DATA_DOC}/checks/${check.id}`, 
                operation: 'delete',
            });
        } else {
             toast({
                variant: "destructive",
                title: "خطا در حذف چک",
                description: error.message || "مشکلی در حذف چک پیش آمد.",
            });
        }
    }
}, [user, firestore, toast]);


  const handleAddNew = React.useCallback(() => {
    setEditingCheck(null);
    setIsFormOpen(true);
  }, []);
  
  const handleEdit = React.useCallback((check: Check) => {
    setEditingCheck(check);
    setIsFormOpen(true);
  }, []);

  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/">
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
              مدیریت چک‌ها
            </h1>
        </div>
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
          categories={categories || []}
          onClear={handleClearCheck}
          onDelete={handleDeleteCheck}
          onEdit={handleEdit}
        />
      )}
    </main>
  );
}
