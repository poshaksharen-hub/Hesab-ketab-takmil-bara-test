'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import type { Income, Expense, BankAccount, UserProfile, Category } from '@/lib/types';
import React from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const userIds = useMemo(() => allUsers.map(u => u.id), [allUsers]);

  const fetchData = async () => {
    if (!firestore || !user || userIds.length === 0) return;
    
    const incomePromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'incomes')));
    const expensePromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'expenses')));
    const bankAccountPromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'bankAccounts')));
    const categoryPromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'categories')));
    const sharedAccountsQuery = user.uid ? query(collection(firestore, 'shared', 'data', 'bankAccounts'), where(`members.${user.uid}`, '!=', undefined)) : null;

    const [
      incomeSnapshots,
      expenseSnapshots,
      bankAccountSnapshots,
      categorySnapshots,
      sharedAccountsSnapshot
    ] = await Promise.all([
      Promise.all(incomePromises),
      Promise.all(expensePromises),
      Promise.all(bankAccountPromises),
      Promise.all(categoryPromises),
      sharedAccountsQuery ? getDocs(sharedAccountsQuery) : Promise.resolve(null),
    ]);

    const incomes = incomeSnapshots.flat().map(snap => snap.docs.map(doc => ({...doc.data(), id: doc.id} as Income))).flat();
    const expenses = expenseSnapshots.flat().map(snap => snap.docs.map(doc => ({...doc.data(), id: doc.id} as Expense))).flat();
    const personalBankAccounts = bankAccountSnapshots.flat().map((snap, index) => snap.docs.map(doc => ({...doc.data(), id: doc.id, userId: userIds[index]} as BankAccount))).flat();
    const categories = categorySnapshots.flat().map(snap => snap.docs.map(doc => ({...doc.data(), id: doc.id } as Category))).flat();
    const sharedBankAccounts = sharedAccountsSnapshot ? sharedAccountsSnapshot.docs.map(doc => ({...doc.data(), id: `shared-${doc.id}`, isShared: true}) as BankAccount) : [];

    setAllIncomes(incomes);
    setAllExpenses(expenses);
    setAllBankAccounts([...personalBankAccounts, ...sharedBankAccounts]);
    setAllCategories(categories);
    setIsLoadingData(false);
  };
  
  useEffect(() => {
    if (!firestore) return;
    
    const fetchInitialUsers = async () => {
        setIsLoadingData(true);
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const userProfiles = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
        setAllUsers(userProfiles);
    };

    fetchInitialUsers();
  }, [firestore]);


  useEffect(() => {
    if (userIds.length > 0 && user) {
      fetchData(); // Initial fetch

      // Set up listeners
      const unsubscribes = userIds.flatMap(uid => [
        onSnapshot(collection(firestore, 'users', uid, 'incomes'), fetchData),
        onSnapshot(collection(firestore, 'users', uid, 'expenses'), fetchData),
        onSnapshot(collection(firestore, 'users', uid, 'bankAccounts'), fetchData),
        onSnapshot(collection(firestore, 'users', uid, 'categories'), fetchData),
      ]);
      
      const sharedSub = user.uid ? onSnapshot(query(collection(firestore, 'shared', 'data', 'bankAccounts'), where(`members.${user?.uid}`, '!=', undefined)), fetchData) : () => {};
      unsubscribes.push(sharedSub);

      return () => unsubscribes.forEach(unsub => unsub());
    }
  }, [userIds, firestore, user]);


  const allTransactions = React.useMemo(() => {
    if (!allIncomes || !allExpenses) return [];
    const combined = [...allIncomes, ...allExpenses];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allIncomes, allExpenses]);

  const recentTransactions = React.useMemo(() => {
    return allTransactions.slice(0, 5);
  }, [allTransactions]);

  const monthlyMetrics = React.useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    const monthlyIncome = (allIncomes || [])
        .filter(inc => {
            const incDate = new Date(inc.date);
            return incDate >= start && incDate <= end;
        })
        .reduce((sum, inc) => sum + inc.amount, 0);
        
    const monthlyExpense = (allExpenses || [])
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= start && expDate <= end;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

    const totalBalance = allBankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    return { monthlyIncome, monthlyExpense, totalBalance };
  }, [allIncomes, allExpenses, allBankAccounts]);


  const isLoading = isUserLoading || isLoadingData;

  if (isLoading) {
    return (
      <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between space-y-2">
           <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-7">
            <Card className="xl:col-span-4">
                 <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                 </CardHeader>
                 <CardContent>
                    <Skeleton className="h-[350px]" />
                 </CardContent>
            </Card>
            <Card className="xl:col-span-3">
                <CardHeader>
                     <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
      </main>
    )
  }
  
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          داشبورد
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OverviewCards 
            totalIncome={monthlyMetrics.monthlyIncome}
            totalExpenses={monthlyMetrics.monthlyExpense}
            balance={monthlyMetrics.totalBalance}
            />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">هزینه بر اساس دسته‌بندی</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
              <SpendingChart transactions={allTransactions} categories={allCategories} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">تراکنش‌های اخیر</CardTitle>
          </CardHeader>
          <CardContent>
              <RecentTransactions transactions={recentTransactions} categories={allCategories} users={allUsers} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
