
'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, ArrowRight, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction, query, where, getDocs } from 'firebase/firestore';
import { CardList } from '@/components/cards/card-list';
import { CardForm } from '@/components/cards/card-form';
import type { BankAccount, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { toEnglishDigits } from '@/lib/utils';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Input } from '@/components/ui/input';


const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

export default function CardsPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();
  
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<BankAccount | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { firestore, bankAccounts: allBankAccounts, incomes, expenses, transfers, checks, loanPayments, debtPayments, users } = allData;

  const hasSharedAccount = useMemo(() => (allBankAccounts || []).some(acc => acc.ownerId === 'shared_account'), [allBankAccounts]);

  const handleFormSubmit = React.useCallback(async (values: Omit<BankAccount, 'id' | 'balance' | 'registeredByUserId'>) => {
    if (!user || !firestore) return;
    
    const collectionRef = collection(firestore, FAMILY_DATA_DOC_PATH, 'bankAccounts');
  
    if (editingCard) {
      // --- Edit ---
      const { initialBalance, ...updateData } = values as any;
       const dataToSend = {
        ...updateData,
        registeredByUserId: editingCard.registeredByUserId, // Preserve original registrar
      };
      updateDocumentNonBlocking(doc(collectionRef, editingCard.id), dataToSend, () => {
        toast({ title: "موفقیت", description: "کارت بانکی با موفقیت ویرایش شد." });
      });

    } else {
        // --- Create ---
        const newCardData: Omit<BankAccount, 'id'> = { 
            ...values,
            registeredByUserId: user.uid,
            balance: values.initialBalance,
            blockedBalance: 0,
        };
        
        addDocumentNonBlocking(collectionRef, newCardData, (id) => {
            updateDoc(doc(collectionRef, id), { id });
            toast({ title: "موفقیت", description: `کارت بانکی جدید با موفقیت اضافه شد.` });
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

    const cardToDeleteRef = doc(firestore, FAMILY_DATA_DOC_PATH, 'bankAccounts', cardId);

    try {
        await runTransaction(firestore, async (transaction) => {
            
            const dependencyChecks = [
              { name: 'هزینه‌ها', data: expenses, field: 'bankAccountId' },
              { name: 'درآمدها', data: incomes, field: 'bankAccountId' },
              { name: 'انتقال‌ها (مبدا)', data: transfers, field: 'fromBankAccountId' },
              { name: 'انتقال‌ها (مقصد)', data: transfers, field: 'toBankAccountId' },
              { name: 'چک‌ها', data: checks, field: 'bankAccountId' },
              { name: 'پرداخت وام‌ها', data: loanPayments, field: 'bankAccountId' },
              { name: 'پرداخت بدهی‌ها', data: debtPayments, field: 'bankAccountId' },
            ];

            for (const dep of dependencyChecks) {
                if (!dep.data) continue;
                 const isUsed = dep.data.some(item => (item as any)[dep.field] === cardId);
                 if (isUsed) {
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
  }, [user, firestore, allBankAccounts, toast, expenses, incomes, transfers, checks, loanPayments, debtPayments]);


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
    if (!allBankAccounts) return [];
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
      
      <div className="md:hidden">
        {isFormOpen && (
           <CardForm
              isOpen={isFormOpen}
              setIsOpen={setIsFormOpen}
              onSubmit={handleFormSubmit}
              initialData={editingCard}
              users={users}
              hasSharedAccount={hasSharedAccount}
            />
        )}
      </div>
      <div className="hidden md:block">
         {isFormOpen && (
           <CardForm
              isOpen={isFormOpen}
              setIsOpen={setIsFormOpen}
              onSubmit={handleFormSubmit}
              initialData={editingCard}
              users={users}
              hasSharedAccount={hasSharedAccount}
            />
        )}
      </div>

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
