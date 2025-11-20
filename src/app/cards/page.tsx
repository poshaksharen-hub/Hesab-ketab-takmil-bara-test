
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { CardList } from '@/components/cards/card-list';
import { CardForm } from '@/components/cards/card-form';
import type { BankAccount, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useDashboardData } from '@/hooks/use-dashboard-data';

export default function CardsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();


  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<BankAccount | null>(null);
  
  const { bankAccounts: allBankAccounts = [], users: allUsers = [] } = allData;
  const hasSharedAccount = allBankAccounts.some(acc => acc.isShared);


  const handleFormSubmit = async (values: Omit<BankAccount, 'id' | 'balance'>) => {
    if (!user || !firestore || allUsers.length === 0) return;
  
    if (editingCard) {
      // --- Edit ---
      const isShared = !!editingCard.isShared;
      const cardId = editingCard.id;
      const ownerId = editingCard.userId;
  
      const cardRef = doc(firestore, isShared ? `shared/data/bankAccounts/${cardId}` : `users/${ownerId}/bankAccounts/${cardId}`);
      // initialBalance, isShared, and owner should not be part of the update data.
      const { initialBalance, isShared: isSharedVal, owner, ...updateData } = values as any;
  
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
        const { owner, ...cardData } = values as any;
        const ownerId = values.owner;
        if (!ownerId || !allUsers.find(u => u.id === ownerId)) {
          toast({ variant: 'destructive', title: 'خطا', description: 'کاربر انتخاب شده معتبر نیست.' });
          return;
        }
  
        const newCard = { 
            ...cardData,
            balance: cardData.initialBalance,
            userId: ownerId,
            isShared: false, // Force to personal
        };
        const userColRef = collection(firestore, 'users', ownerId, 'bankAccounts');
        
        addDoc(userColRef, newCard)
          .then((docRef) => {
            updateDoc(docRef, { id: docRef.id }); // Add the id to the document
            toast({ title: "موفقیت", description: "کارت بانکی جدید با موفقیت اضافه شد." });
          })
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: userColRef.path,
              operation: 'create',
              requestResourceData: newCard,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
    }
    setIsFormOpen(false);
    setEditingCard(null);
  };

  const handleDelete = async (cardId: string) => {
    if (!user || !firestore || allUsers.length === 0) return;
    
    const userIds = allUsers.map(u => u.id);
    const cardToDelete = allBankAccounts.find(c => c.id === cardId);

    if (!cardToDelete) {
        toast({ variant: 'destructive', title: 'خطا', description: 'کارت مورد نظر برای حذف یافت نشد.'});
        return;
    }

    let cardToDeleteRef;
    if (cardToDelete.isShared) {
        cardToDeleteRef = doc(firestore, 'shared', 'data', 'bankAccounts', cardId);
    } else {
        if (!cardToDelete.userId) {
            toast({ variant: 'destructive', title: 'خطا', description: 'مالک کارت شخصی برای حذف یافت نشد.' });
            return;
        }
        cardToDeleteRef = doc(firestore, `users/${cardToDelete.userId}/bankAccounts/${cardId}`);
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            // Check for dependencies across all users first
            for (const userId of userIds) {
                const checksRef = collection(firestore, 'users', userId, 'checks');
                const pendingChecksQuery = query(checksRef, where('bankAccountId', '==', cardId), where('status', '==', 'pending'));
                const pendingChecksSnapshot = await transaction.get(pendingChecksQuery);

                if (!pendingChecksSnapshot.empty) {
                    throw new Error("امکان حذف وجود ندارد. این کارت در یک یا چند چک پاس نشده استفاده شده است.");
                }

                const loanPaymentsRef = collection(firestore, 'users', userId, 'loanPayments');
                const loanPaymentsQuery = query(loanPaymentsRef, where('bankAccountId', '==', cardId));
                const loanPaymentsSnapshot = await transaction.get(loanPaymentsQuery);
                
                if(!loanPaymentsSnapshot.empty) {
                    throw new Error("امکان حذف وجود ندارد. از این کارت برای پرداخت اقساط وام استفاده شده است.");
                }
            }
            
             const cardDoc = await transaction.get(cardToDeleteRef);
             if (!cardDoc.exists()) {
                 throw new Error("کارت بانکی برای حذف در پایگاه داده یافت نشد.");
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
  };


  const handleEdit = (card: BankAccount) => {
    setEditingCard(card);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingCard(null);
    setIsFormOpen(true);
  };
  
  const isLoading = isUserLoading || isDashboardLoading;

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          مدیریت کارت‌های بانکی
        </h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="ml-2 h-4 w-4" />
          افزودن کارت جدید
        </Button>
      </div>

      {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-56 w-full rounded-xl" />
          </div>
      ) : isFormOpen ? (
        <CardForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingCard}
          user={user}
          users={allUsers}
          hasSharedAccount={hasSharedAccount}
        />
      ) : (
        <CardList
          cards={allBankAccounts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          users={allUsers}
        />
      )}
    </main>
  );
}
