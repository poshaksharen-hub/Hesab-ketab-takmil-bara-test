
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, ArrowRight, Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction, query, where, getDocs } from 'firebase/firestore';
import { CardList } from '@/components/cards/card-list';
import { CardForm } from '@/components/cards/card-form';
import type { BankAccount, UserProfile, OwnerId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { USER_DETAILS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { toEnglishDigits } from '@/lib/utils';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';

const FAMILY_DATA_DOC = 'shared-data';

export default function CardsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<BankAccount | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const { bankAccounts: allBankAccounts = [], users: allUsers = [] } = allData;
  const hasSharedAccount = allBankAccounts.some(acc => acc.ownerId === 'shared_account');


  const handleFormSubmit = React.useCallback(async (values: Omit<BankAccount, 'id' | 'balance'>) => {
    if (!user || !firestore) return;
    
    const collectionRef = collection(firestore, 'family-data', FAMILY_DATA_DOC, 'bankAccounts');
  
    if (editingCard) {
      // --- Edit ---
      const cardRef = doc(collectionRef, editingCard.id);
      const { initialBalance, ...updateData } = values as any;
  
      updateDoc(cardRef, updateData)
        .then(() => {
            toast({ title: "موفقیت", description: "کارت بانکی با موفقیت ویرایش شد." });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: cardRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

    } else {
        // --- Create ---
        const newCard = { 
            ...values,
            balance: values.initialBalance,
        };
        
        addDoc(collectionRef, newCard)
            .then((docRef) => {
              if (docRef) {
                updateDoc(docRef, { id: docRef.id });
                toast({ title: "موفقیت", description: `کارت بانکی جدید با موفقیت اضافه شد.` });
              }
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: collectionRef.path,
                    operation: 'create',
                    requestResourceData: newCard,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    }
    setIsFormOpen(false);
    setEditingCard(null);
  }, [user, firestore, editingCard, toast]);

  const handleDelete = React.useCallback(async (cardId: string) => {
    if (!user || !firestore || !allBankAccounts) return;
    
    const cardToDelete = allBankAccounts.find(c => c.id === cardId);
    if (!cardToDelete) {
        toast({ variant: 'destructive', title: 'خطا', description: 'کارت مورد نظر برای حذف یافت نشد.'});
        return;
    }

    const cardToDeleteRef = doc(firestore, 'family-data', FAMILY_DATA_DOC, 'bankAccounts', cardId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
            
            const dependencyChecks = [
              { name: 'هزینه‌ها', collection: 'expenses', field: 'bankAccountId' },
              { name: 'درآمدها', collection: 'incomes', field: 'bankAccountId' },
              { name: 'انتقال‌ها (مبدا)', collection: 'transfers', field: 'fromBankAccountId' },
              { name: 'انتقال‌ها (مقصد)', collection: 'transfers', field: 'toBankAccountId' },
              { name: 'چک‌ها', collection: 'checks', field: 'bankAccountId' },
              { name: 'پرداخت وام‌ها', collection: 'loanPayments', field: 'bankAccountId' },
              { name: 'پرداخت بدهی‌ها', collection: 'debtPayments', field: 'bankAccountId' },
            ];

            for (const dep of dependencyChecks) {
                const q = query(collection(familyDataRef, dep.collection), where(dep.field, '==', cardId));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    throw new Error(`امکان حذف وجود ندارد. این کارت در یک یا چند تراکنش (${dep.name}) استفاده شده است.`);
                }
            }
                         
             transaction.delete(cardToDeleteRef);
        });

        toast({ title: "موفقیت", description: "کارت بانکی با موفقیت حذف شد." });
    } catch (error: any) {
        if (error.name === 'FirebaseError') {
             const permissionError = new FirestorePermissionError({
                path: cardToDeleteRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: "destructive",
                title: "خطا در حذف کارت",
                description: error.message || "مشکلی در حذف کارت پیش آمد.",
            });
        }
    }
  }, [user, firestore, allBankAccounts, toast]);


  const handleEdit = React.useCallback((card: BankAccount) => {
    setEditingCard(card);
    setIsFormOpen(true);
  }, []);

  const handleAddNew = React.useCallback(() => {
    setEditingCard(null);
    setIsFormOpen(true);
  }, []);
  
  const isLoading = isUserLoading || isDashboardLoading;
  
  const filteredBankAccounts = React.useMemo(() => {
    if (!searchQuery) {
      return allBankAccounts;
    }
    const query = toEnglishDigits(searchQuery).toLowerCase();
    return allBankAccounts.filter(card => 
      card.bankName.toLowerCase().includes(query) ||
      card.cardNumber.includes(query) ||
      (card.accountNumber && card.accountNumber.includes(query))
    );
  }, [searchQuery, allBankAccounts]);


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
            مدیریت کارت‌های بانکی
          </h1>
        </div>
        <div className="hidden md:block">
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                افزودن کارت جدید
            </Button>
        </div>
      </div>

      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="جستجو در نام بانک, شماره کارت..."
          className="w-full pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isFormOpen && (
        <CardForm
            onSubmit={handleFormSubmit}
            initialData={editingCard}
            user={user}
            users={allUsers}
            hasSharedAccount={hasSharedAccount}
            onCancel={() => setIsFormOpen(false)}
        />
      )}

      {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-56 w-full rounded-xl" />
          </div>
      ) : !isFormOpen && (
        <CardList
          cards={filteredBankAccounts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          users={allUsers}
        />
      )}

      {/* Floating Action Button for Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
          <Button
            onClick={handleAddNew}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            aria-label="افزودن کارت جدید"
          >
            <Plus className="h-6 w-6" />
          </Button>
      </div>
    </div>
  );
}
