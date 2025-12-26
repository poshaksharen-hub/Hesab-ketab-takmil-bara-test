'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, ArrowRight, Plus } from 'lucide-react';
import { CardList } from '@/components/cards/card-list';
import { CardForm } from '@/components/cards/card-form';
import type { BankAccount, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { toEnglishDigits } from '@/lib/utils';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { supabase } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

export default function CardsPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const { isLoading: isDashboardLoading, allData } = useDashboardData();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<BankAccount | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
      setIsUserLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null);
      setIsUserLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const { bankAccounts: allBankAccounts, incomes, expenses, transfers, checks, loanPayments, debtPayments, users } = allData;

  const hasSharedAccount = useMemo(() => (allBankAccounts || []).some(acc => acc.ownerId === 'shared_account'), [allBankAccounts]);

  const handleFormSubmit = useCallback(async (values: Omit<BankAccount, 'id' | 'balance' | 'registeredByUserId' | 'blockedBalance'>) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    
    const cardData = {
        ...values,
        registered_by_user_id: currentUser.uid,
        balance: values.initialBalance,
    };
    
    // TODO: Implement Supabase logic for add/edit
    toast({ title: "در حال توسعه", description: "عملیات ثبت کارت هنوز پیاده‌سازی نشده است."});
    
    setIsSubmitting(false);
    setIsFormOpen(false);
  }, [currentUser, toast, editingCard]);

  const handleDelete = useCallback(async (cardId: string) => {
    // TODO: Implement Supabase logic
    toast({ title: "در حال توسعه", description: "عملیات حذف کارت هنوز پیاده‌سازی نشده است."});
  }, [currentUser, allBankAccounts, toast, expenses, incomes, transfers, checks, loanPayments, debtPayments]);


  const handleEdit = useCallback((card: BankAccount) => {
    setEditingCard(card);
    setIsFormOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
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
      
       {isFormOpen && (
           <CardForm
              isOpen={isFormOpen}
              setIsOpen={setIsFormOpen}
              onSubmit={handleFormSubmit}
              initialData={editingCard}
              users={users}
              hasSharedAccount={hasSharedAccount}
              isSubmitting={isSubmitting}
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
