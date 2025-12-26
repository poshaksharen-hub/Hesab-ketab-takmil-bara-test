
'use client';

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Plus } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { CheckList } from '@/components/checks/check-list';
import { CheckForm } from '@/components/checks/check-form';
import type { Check, BankAccount, Payee, Category, Expense, TransactionDetails, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { USER_DETAILS } from '@/lib/constants';

type CheckFormData = Omit<Check, 'id' | 'registeredByUserId' | 'status'> & { signatureDataUrl?: string };

export default function ChecksPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // TODO: Replace with Supabase data fetching
  const isDashboardLoading = true;
  const allData = {
    checks: [],
    bankAccounts: [],
    payees: [],
    categories: [],
    users: [],
  };

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCheck, setEditingCheck] = React.useState<Check | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const { checks, bankAccounts, payees, categories, users } = allData;

  const handleFormSubmit = useCallback(async (values: CheckFormData) => {
    // TODO: Implement Supabase logic
    toast({ title: "در حال توسعه", description: "عملیات ثبت چک هنوز پیاده‌سازی نشده است."});
  }, [user, firestore, editingCheck, toast, bankAccounts, payees, categories, users]);
  
    const handleClearCheck = React.useCallback(async (check: Check) => {
    // TODO: Implement Supabase logic
    toast({ title: "در حال توسعه", description: "عملیات پاس کردن چک هنوز پیاده‌سازی نشده است."});
  }, [user, firestore, bankAccounts, payees, categories, users, toast]);
  
  const handleDeleteCheck = React.useCallback(async (check: Check) => {
    // TODO: Implement Supabase logic
    toast({ title: "در حال توسعه", description: "عملیات حذف چک هنوز پیاده‌سازی نشده است."});
}, [user, firestore, toast]);

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
