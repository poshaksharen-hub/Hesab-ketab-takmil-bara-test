'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { CardList } from '@/components/cards/card-list';
import { CardForm } from '@/components/cards/card-form';
import type { BankAccount, Check, LoanPayment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function CardsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<BankAccount | null>(null);

  const bankAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'bankAccounts') : null),
    [firestore, user]
  );
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useCollection<BankAccount>(bankAccountsQuery);
  
  const sharedBankAccountsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'shared', 'bankAccounts'), where(`members.${user.uid}`, '==', true)) : null),
    [firestore, user]
  );
  const { data: sharedBankAccounts, isLoading: isLoadingSharedBankAccounts } = useCollection<BankAccount>(sharedBankAccountsQuery);

   const allBankAccounts = React.useMemo(() => {
    const personal = bankAccounts || [];
    const shared = (sharedBankAccounts || []).map(acc => ({...acc, isShared: true, id: `shared-${acc.id}`}));
    return [...personal, ...shared];
  }, [bankAccounts, sharedBankAccounts]);


  const handleFormSubmit = async (values: Omit<BankAccount, 'id' | 'balance' | 'userId'>) => {
    if (!user || !firestore) return;

    if (editingCard) {
      // Edit
      const cardRef = doc(firestore, editingCard.isShared ? `shared/bankAccounts/${editingCard.id.replace('shared-','')}` : `users/${user.uid}/bankAccounts/${editingCard.id}`);
      const { initialBalance, ...updateData } = values; // Exclude initialBalance on edit
      await updateDoc(cardRef, updateData);
      toast({ title: "موفقیت", description: "کارت بانکی با موفقیت ویرایش شد." });
    } else {
      // Create
      const newCard = {
        ...values,
        userId: user.uid,
        balance: values.initialBalance,
      };
      if(values.isShared){
         const sharedColRef = collection(firestore, 'shared', 'bankAccounts');
         await addDoc(sharedColRef, {...newCard, members: {[user.uid]: true}}); // Add member field
      } else {
         const userColRef = collection(firestore, 'users', user.uid, 'bankAccounts');
         await addDoc(userColRef, newCard);
      }
      toast({ title: "موفقیت", description: "کارت بانکی جدید با موفقیت اضافه شد." });
    }
    setIsFormOpen(false);
    setEditingCard(null);
  };

  const handleDelete = async (cardId: string, isShared: boolean) => {
    if (!user || !firestore) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const checksRef = collection(firestore, 'users', user.uid, 'checks');
            const pendingChecksQuery = query(checksRef, where('bankAccountId', '==', cardId), where('status', '==', 'pending'));
            const pendingChecksSnapshot = await getDocs(pendingChecksQuery);

            if (!pendingChecksSnapshot.empty) {
                throw new Error("امکان حذف وجود ندارد. این کارت در یک یا چند چک پاس نشده استفاده شده است.");
            }

            const loanPaymentsRef = collection(firestore, 'users', user.uid, 'loanPayments');
            const loanPaymentsQuery = query(loanPaymentsRef, where('bankAccountId', '==', cardId));
            const loanPaymentsSnapshot = await getDocs(loanPaymentsQuery);
            
            if(!loanPaymentsSnapshot.empty) {
                throw new Error("امکان حذف وجود ندارد. از این کارت برای پرداخت اقساط وام استفاده شده است.");
            }

            const cardRef = doc(firestore, isShared ? `shared/bankAccounts/${cardId.replace('shared-','')}` :`users/${user.uid}/bankAccounts/${cardId}`);
            transaction.delete(cardRef);
        });

        toast({ title: "موفقیت", description: "کارت بانکی با موفقیت حذف شد." });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطا در حذف کارت",
            description: error.message || "مشکلی در حذف کارت پیش آمد.",
        });
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
  
  const isLoading = isUserLoading || isLoadingBankAccounts || isLoadingSharedBankAccounts;

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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
          </div>
      ) : isFormOpen ? (
        <CardForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingCard}
          user={user}
        />
      ) : (
        <CardList
          cards={allBankAccounts}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
