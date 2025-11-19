'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, onSnapshot, getDocs, where, Unsubscribe } from 'firebase/firestore';
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

  // Effect to fetch initial user profiles once
  useEffect(() => {
    if (!firestore) return;
    const fetchInitialUsers = async () => {
      setIsLoadingData(true);
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const userProfiles = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
      setAllUsers(userProfiles);
      setIsLoadingData(false); // Set to false after users are fetched
    };
    fetchInitialUsers();
  }, [firestore]);

  // Effect to set up listeners when users are available
  useEffect(() => {
    if (!firestore || allUsers.length === 0) return;

    const userIds = allUsers.map(u => u.id);
    const unsubscribes: Unsubscribe[] = [];

    const setupListeners = <T,>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const itemUnsubscribes = userIds.map(uid => {
            const q = collection(firestore, 'users', uid, collectionName);
            return onSnapshot(q, (snapshot) => {
                // When any user's collection changes, refetch all data for that collection type
                Promise.all(userIds.map(id => getDocs(collection(firestore, 'users', id, collectionName))))
                    .then(snapshots => {
                        const allItems = snapshots.flat().map(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as T))).flat();
                        setter(allItems);
                    });
            });
        });
        unsubscribes.push(...itemUnsubscribes);
    };

    setupListeners<Income>('incomes', setAllIncomes);
    setupListeners<Expense>('expenses', setAllExpenses);
    setupListeners<Category>('categories', setAllCategories);

    // Listener for bank accounts (personal and shared)
    const personalAccountUnsubscribes = userIds.map(uid => {
      return onSnapshot(collection(firestore, 'users', uid, 'bankAccounts'), () => {
        // Refetch all personal and shared accounts when any personal account changes
        fetchAllBankAccounts();
      });
    });
    unsubscribes.push(...personalAccountUnsubscribes);
    
    const fetchAllBankAccounts = async () => {
        const personalPromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, 'bankAccounts')));
        const personalSnapshots = await Promise.all(personalPromises);
        const personalAccounts = personalSnapshots.flat().map((snap, index) => snap.docs.map(doc => ({...doc.data(), id: doc.id, userId: userIds[index]} as BankAccount))).flat();

        const sharedQuery = user?.uid ? query(collection(firestore, 'shared', 'data', 'bankAccounts'), where(`members.${user.uid}`, '==', true)) : null;
        if (sharedQuery) {
          const sharedSnapshots = await getDocs(sharedQuery);
          const sharedAccounts = sharedSnapshots.docs.map(doc => ({...doc.data(), id: doc.id, isShared: true}) as BankAccount);
          setAllBankAccounts([...personalAccounts, ...sharedAccounts]);
        } else {
           setAllBankAccounts(personalAccounts);
        }
    };

    if (user?.uid) {
        const sharedQuery = query(collection(firestore, 'shared', 'data', 'bankAccounts'), where(`members.${user.uid}`, '==', true));
        const sharedUnsubscribe = onSnapshot(sharedQuery, () => {
            fetchAllBankAccounts();
        });
        unsubscribes.push(sharedUnsubscribe);
    }
    
    // Initial fetch for bank accounts
    fetchAllBankAccounts();

    return () => unsubscribes.forEach(unsub => unsub());
  }, [firestore, allUsers, user]);


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
