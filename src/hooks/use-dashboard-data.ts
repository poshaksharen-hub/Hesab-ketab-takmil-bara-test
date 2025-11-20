'use client';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, onSnapshot, DocumentData, Unsubscribe, query } from 'firebase/firestore';
import type {
  Income,
  Expense,
  BankAccount,
  UserProfile,
  Category,
  Check,
  FinancialGoal,
  Loan,
  Payee,
  Transfer,
  LoanPayment,
} from '@/lib/types';
import { USER_DETAILS } from '@/lib/constants';

export type OwnerFilter = 'all' | string | 'shared';

type AllData = {
  users: UserProfile[];
  incomes: Income[];
  expenses: Expense[];
  bankAccounts: BankAccount[];
  categories: Category[];
  checks: Check[];
  goals: FinancialGoal[];
  loans: Loan[];
  payees: Payee[];
  transfers: Transfer[];
  loanPayments: LoanPayment[];
};

const useAllCollections = () => {
    const firestore = useFirestore();
    const [allData, setAllData] = useState<AllData>({
        users: [], incomes: [], expenses: [], bankAccounts: [], categories: [], checks: [], 
        goals: [], loans: [], payees: [], transfers: [], loanPayments: []
    });
    const [isLoading, setIsLoading] = useState(true);

    const usersQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'users') : null),
        [firestore]
    );
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

    const userIds = useMemo(() => (users || []).map(u => u.id), [users]);

     const sharedAccountsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'shared', 'data', 'bankAccounts')) : null),
        [firestore]
    );
    const { data: sharedAccounts, isLoading: isLoadingSharedAccounts } = useCollection<BankAccount>(sharedAccountsQuery);
    
    // Effect for fetching all user-specific sub-collections
    useEffect(() => {
        if (!firestore || userIds.length === 0) {
            if(!isLoadingUsers) setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const subCollections = ['incomes', 'expenses', 'categories', 'checks', 'financialGoals', 'loans', 'payees', 'transfers', 'bankAccounts', 'loanPayments'];
        const unsubs: Unsubscribe[] = [];

        let collectionsLoaded = 0;
        const totalCollectionsToLoad = subCollections.length * userIds.length;
        
        let tempData: any = { };
        subCollections.forEach(sc => tempData[sc] = []);

        const checkLoadingDone = () => {
            if (collectionsLoaded >= totalCollectionsToLoad) {
                setAllData(prev => ({...prev, ...tempData}));
                setIsLoading(false);
            }
        };

        subCollections.forEach(colName => {
            userIds.forEach(uid => {
                const q = query(collection(firestore, `users/${uid}/${colName}`));
                const unsub = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as DocumentData[];
                    const existingData = tempData[colName].filter((item: any) => item.userId !== uid);
                    tempData[colName] = [...existingData, ...data];
                    collectionsLoaded++;
                    checkLoadingDone();
                }, (error) => {
                    console.error(`Error fetching ${colName} for user ${uid}:`, error);
                    collectionsLoaded++;
                    checkLoadingDone();
                });
                unsubs.push(unsub);
            });
        });

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [firestore, userIds, isLoadingUsers]);


    // This effect combines personal and shared bank accounts once they are both loaded.
    useEffect(() => {
        if (isLoadingUsers || isLoadingSharedAccounts) {
            setIsLoading(true);
            return;
        }
        
        setAllData(prev => {
            const personalAccounts = prev.bankAccounts || [];
            const combinedAccounts = [
                ...personalAccounts,
                ...(sharedAccounts || []).map(sa => ({ ...sa, isShared: true }))
            ];
             // Deduplicate accounts
            const uniqueAccounts = Array.from(new Map(combinedAccounts.map(item => [item.id, item])).values());
            
            return {
                ...prev,
                users: users || [],
                bankAccounts: uniqueAccounts,
            };
        });

    }, [sharedAccounts, users, isLoadingUsers, isLoadingSharedAccounts]);

    return { isLoading, allData };
};


export function useDashboardData() {
  const { isLoading, allData } = useAllCollections();
  
  const getFilteredData = (dateRange?: { from: Date, to: Date }) => {
    
    const dateMatches = (dateStr: string) => {
        if (!dateRange || !dateRange.from || !dateRange.to) return true;
        const itemDate = new Date(dateStr);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };
    
    const filteredIncomes = allData.incomes.filter(i => dateMatches(i.date));
    const filteredExpenses = allData.expenses.filter(e => dateMatches(e.date));

    const totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    
    const totalAssets = allData.bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const pendingChecksAmount = allData.checks
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);
    
    const remainingLoanAmount = allData.loans.reduce((sum, l) => sum + l.remainingAmount, 0);
    const totalLiabilities = pendingChecksAmount + remainingLoanAmount;
    const netWorth = totalAssets - totalLiabilities;
    
    const allTransactions = [...filteredIncomes, ...filteredExpenses].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    const aliId = allData.users.find(u => u.email.startsWith('ali'))?.id;
    const fatemehId = allData.users.find(u => u.email.startsWith('fatemeh'))?.id;
    
    const aliBalance = allData.bankAccounts.filter(b => b.userId === aliId && !b.isShared).reduce((sum, acc) => sum + acc.balance, 0);
    const fatemehBalance = allData.bankAccounts.filter(b => b.userId === fatemehId && !b.isShared).reduce((sum, acc) => sum + acc.balance, 0);
    const sharedBalance = allData.bankAccounts.filter(b => b.isShared).reduce((sum, acc) => sum + acc.balance, 0);

    return {
      summary: {
        totalIncome,
        totalExpense,
        netWorth,
        totalAssets,
        totalLiabilities,
        aliBalance,
        fatemehBalance,
        sharedBalance,
      },
      details: {
        incomes: filteredIncomes,
        expenses: filteredExpenses,
        transactions: allTransactions,
      },
      allData,
    };
  };

  return { 
    isLoading, 
    getFilteredData, 
    allData
  };
}
