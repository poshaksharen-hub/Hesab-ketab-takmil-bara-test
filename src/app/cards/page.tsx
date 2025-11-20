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
  
  const { bankAccounts: allBankAccounts, users: allUsers } = allData;


  const handleFormSubmit = async (values: Omit<BankAccount, 'id' | 'balance'>) => {
    if (!user || !firestore || allUsers.length === 0) return;

    if (editingCard) {
      // --- Edit ---
      const isShared = !!editingCard.isShared;
      const cardId = editingCard.id;
      const ownerId = editingCard.userId;
      
      const cardRef = doc(firestore, isShared ? `shared/data/bankAccounts/${cardId}` : `users/${ownerId}/bankAccounts/${cardId}`);
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
      const { isShared, owner, ...cardData } = values as any;
      const newCardBase = {
        ...cardData,
        balance: values.initialBalance,
      };

      if (isShared) {
        const members: { [key: string]: boolean } = {};
        allUsers.forEach(u => {
            members[u.id] = true;
        });

        const newSharedCard = { ...newCardBase, members, userId: null, isShared: true };
        const sharedColRef = collection(firestore, 'shared', 'data', 'bankAccounts');
        addDoc(sharedColRef, newSharedCard)
          .then(() => {
            toast({ title: "موفقیت", description: "کارت بانکی مشترک جدید با موفقیت اضافه شد." });
          })
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: sharedColRef.path,
              operation: 'create',
              requestResourceData: newSharedCard,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
      } else {
        const ownerId = owner;
        if (!ownerId || !allUsers.find(u => u.id === ownerId)) {
            toast({ variant: 'destructive', title: 'خطا', description: 'کاربر انتخاب شده معتبر نیست.' });
            return;
        }

        const newCard = { ...newCardBase, userId: ownerId, isShared: false };
        const userColRef = collection(firestore, 'users', ownerId, 'bankAccounts');
        addDoc(userColRef, newCard)
          .then(() => {
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
    }
    setIsFormOpen(false);
    setEditingCard(null);
  };

  const handleDelete = async (cardId: string, isShared: boolean) => {
    if (!user || !firestore || allUsers.length === 0) return;
    
    const userIds = allUsers.map(u => u.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            const realCardId = cardId;
            let cardToDeleteRef;
            
            // Comprehensive check across all users' collections
            for (const userId of userIds) {
                const checksRef = collection(firestore, 'users', userId, 'checks');
                const pendingChecksQuery = query(checksRef, where('bankAccountId', '==', realCardId), where('status', '==', 'pending'));
                const pendingChecksSnapshot = await transaction.get(pendingChecksQuery);

                if (!pendingChecksSnapshot.empty) {
                    throw new Error("امکان حذف وجود ندارد. این کارت در یک یا چند چک پاس نشده استفاده شده است.");
                }

                const loanPaymentsRef = collection(firestore, 'users', userId, 'loanPayments');
                const loanPaymentsQuery = query(loanPaymentsRef, where('bankAccountId', '==', realCardId));
                const loanPaymentsSnapshot = await transaction.get(loanPaymentsQuery);
                
                if(!loanPaymentsSnapshot.empty) {
                    throw new Error("امکان حذف وجود ندارد. از این کارت برای پرداخت اقساط وام استفاده شده است.");
                }
            }
            
            let ownerId;
            if (isShared) {
                cardToDeleteRef = doc(firestore, 'shared', 'data', 'bankAccounts', realCardId);
            } else {
                const cardOwner = allBankAccounts.find(c => c.id === cardId && !c.isShared);
                ownerId = cardOwner?.userId;
                if (!ownerId) throw new Error("مالک کارت شخصی برای حذف یافت نشد.");
                cardToDeleteRef = doc(firestore, `users/${ownerId}/bankAccounts/${cardId}`);
            }

             const cardDoc = await transaction.get(cardToDeleteRef);
             if (!cardDoc.exists()) {
                 throw new Error("کارت بانکی برای حذف یافت نشد.");
             }
             transaction.delete(cardToDeleteRef);
        });

        toast({ title: "موفقیت", description: "کارت بانکی با موفقیت حذف شد." });
    } catch (error: any) {
        if (error instanceof FirestorePermissionError) {
             errorEmitter.emit('permission-error', error);
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
