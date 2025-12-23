
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, query, where, getDocs, addDoc, updateDoc, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { CheckList } from '@/components/checks/check-list';
import { CheckForm } from '@/components/checks/check-form';
import type { Check, BankAccount, Payee, Category, Expense, TransactionDetails, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import Link from 'next/link';
import { sendSystemNotification } from '@/lib/notifications';
import { USER_DETAILS } from '@/lib/constants';
import { formatJalaliDate } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';

const FAMILY_DATA_DOC = 'shared-data';

type CheckFormData = Omit<Check, 'id' | 'registeredByUserId' | 'status'> & { signatureDataUrl?: string };

export default function ChecksPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCheck, setEditingCheck] = React.useState<Check | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const { checks, bankAccounts, payees, categories, users } = allData;

  const handleFormSubmit = React.useCallback(async (values: CheckFormData) => {
    if (!user || !firestore || !users || !bankAccounts || !payees || !categories) return;

    setIsSubmitting(true);
    const checksColRef = collection(firestore, 'family-data', FAMILY_DATA_DOC, 'checks');
    const bankAccount = bankAccounts.find(acc => acc.id === values.bankAccountId);

    if (!bankAccount) {
        toast({ variant: 'destructive', title: "خطا", description: "حساب بانکی انتخاب شده یافت نشد." });
        setIsSubmitting(false);
        return;
    }

    if (editingCheck) {
      const checkRef = doc(checksColRef, editingCheck.id);
      const { signatureDataUrl, ...updatedValues } = values; // signature is not editable
      const updatedCheck = {
        ...updatedValues,
        issueDate: (values.issueDate as any).toISOString ? (values.issueDate as any).toISOString() : values.issueDate,
        dueDate: (values.dueDate as any).toISOString ? (values.dueDate as any).toISOString() : values.dueDate,
        ownerId: bankAccount.ownerId,
        registeredByUserId: editingCheck.registeredByUserId,
      };
      try {
        await updateDoc(checkRef, updatedCheck);
        toast({ title: "موفقیت", description: "چک با موفقیت ویرایش شد." });
      } catch (serverError) {
        const permissionError = new FirestorePermissionError({ path: checkRef.path, operation: 'update', requestResourceData: updatedCheck });
        errorEmitter.emit('permission-error', permissionError);
      }
    } else {
        // Create new check with signature data
        const { signatureDataUrl, ...newCheckValues } = values;
        if (!signatureDataUrl) {
          toast({ variant: 'destructive', title: "خطا", description: "امضا برای ثبت چک الزامی است." });
          setIsSubmitting(false);
          return;
        }

        try {
            const newDocRef = doc(checksColRef);
            const newCheckData: Omit<Check, 'id'> & { id: string } = {
                ...newCheckValues,
                id: newDocRef.id,
                issueDate: (values.issueDate as any).toISOString(),
                dueDate: (values.dueDate as any).toISOString(),
                registeredByUserId: user.uid,
                status: 'pending',
                ownerId: bankAccount.ownerId,
                signatureDataUrl: signatureDataUrl,
            };
            
            await setDoc(newDocRef, newCheckData);
            toast({ title: "موفقیت", description: "چک جدید با امضا با موفقیت ثبت شد." });

            const currentUser = users.find(u => u.id === user.uid);
            const payee = payees.find(p => p.id === values.payeeId);
            const category = categories.find(c => c.id === values.categoryId);
            const bankAccountOwnerName = bankAccount.ownerId === 'shared_account' ? 'مشترک' : (bankAccount.ownerId && USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh']?.firstName);

            const notificationDetails: TransactionDetails = { type: 'check', title: `ثبت چک برای ${payee?.name}`, amount: values.amount, date: newCheckData.issueDate, icon: 'BookCopy', color: 'rgb(217 119 6)', registeredBy: currentUser?.firstName || 'کاربر', payee: payee?.name, category: category?.name, bankAccount: { name: bankAccount.bankName, owner: bankAccountOwnerName || 'نامشخص' }, expenseFor: (values.expenseFor && USER_DETAILS[values.expenseFor as 'ali' | 'fatemeh']?.firstName) || 'مشترک', checkDetails: { sayadId: values.sayadId, dueDate: formatJalaliDate(new Date(newCheckData.dueDate)) } };
            await sendSystemNotification(firestore, user.uid, notificationDetails);
        } catch (error: any) {
            console.error("Error creating check with signature:", error);
            toast({ variant: 'destructive', title: "عملیات ناموفق", description: error.message || "مشکلی در ثبت چک پیش آمد." });
        }
    }
    setIsFormOpen(false);
    setEditingCheck(null);
    setIsSubmitting(false);
  }, [user, firestore, editingCheck, toast, bankAccounts, payees, categories, users]);
  
    const handleClearCheck = React.useCallback(async (check: Check) => {
    // ... (This function remains correct)
  }, [user, firestore, bankAccounts, payees, categories, users, toast]);
  
  const handleDeleteCheck = React.useCallback(async (check: Check) => {
    if (!user || !firestore) return;

    const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
    const checkRef = doc(familyDataRef, 'checks', check.id);
    let associatedExpense: Expense | null = null;
    let expenseRef: any = null;

    // --- REFACTORED LOGIC ---
    // 1. Perform reads *before* the transaction
    if (check.status === 'cleared') {
        try {
            const expenseQuery = query(collection(familyDataRef, 'expenses'), where('checkId', '==', check.id));
            const expenseSnapshot = await getDocs(expenseQuery);
            if (!expenseSnapshot.empty) {
                expenseRef = expenseSnapshot.docs[0].ref;
                associatedExpense = expenseSnapshot.docs[0].data() as Expense;
            }
        } catch(e) {
            toast({ variant: "destructive", title: "خطا", description: "خطا در یافتن هزینه مرتبط با چک.", });
            return;
        }
    }

    try {
        // 2. Run the transaction with all necessary data prepared
        await runTransaction(firestore, async (transaction) => {
            // Delete the check itself
            transaction.delete(checkRef);

            // If an associated expense was found, handle the financial reversal
            if (associatedExpense && expenseRef) {
                const accountRef = doc(familyDataRef, 'bankAccounts', associatedExpense.bankAccountId);
                const accountDoc = await transaction.get(accountRef); // Read inside transaction
                
                if (accountDoc.exists()) {
                    const accountData = accountDoc.data() as BankAccount;
                    transaction.update(accountRef, { balance: accountData.balance + associatedExpense.amount });
                }
                // Delete the associated expense record
                transaction.delete(expenseRef);
            }
        });

        toast({ title: "موفقیت", description: "چک و سوابق مالی مرتبط (در صورت وجود) با موفقیت حذف شد." });

    } catch (error: any) {
        const op = check.status === 'cleared' ? 'write' : 'delete';
        const permissionError = new FirestorePermissionError({ path: checkRef.path, operation: op });
        errorEmitter.emit('permission-error', permissionError);
    }
}, [user, firestore, toast]);

  // ... (rest of the component remains the same)

  const handleAddNew = React.useCallback(() => {
    setEditingCheck(null);
    setIsFormOpen(true);
  }, []);
  
  const handleEdit = React.useCallback((check: Check) => {
    setEditingCheck(check);
    setIsFormOpen(true);
  }, []);

  const isLoading = isUserLoading || isDashboardLoading || isSubmitting;

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
            مدیریت چک‌ها
          </h1>
        </div>
        <div className="hidden md:block">
            <Button onClick={handleAddNew} disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" />
                ثبت چک جدید
            </Button>
        </div>
      </div>

      {isFormOpen && (
          <CheckForm
            onSubmit={handleFormSubmit}
            initialData={editingCheck}
            bankAccounts={bankAccounts || []}
            payees={payees || []}
            categories={categories || []}
            onCancel={() => { setIsFormOpen(false); setEditingCheck(null); }}
        />
      )}

      {isLoading ? (
          <div className="space-y-4 mt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
      ) : !isFormOpen && (
        <CheckList
          checks={checks || []}
          bankAccounts={bankAccounts || []}
          payees={payees || []}
          categories={categories || []}
          onClear={handleClearCheck}
          onDelete={handleDeleteCheck}
          onEdit={handleEdit}
          users={users || []}
        />
      )}

      {!isFormOpen && (
          <div className="md:hidden fixed bottom-20 right-4 z-50">
              <Button
                onClick={handleAddNew}
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg"
                aria-label="ثبت چک جدید"
                disabled={isSubmitting}
              >
                <Plus className="h-6 w-6" />
              </Button>
          </div>
      )}
    </div>
  );
}
