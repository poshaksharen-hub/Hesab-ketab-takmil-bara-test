
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
import type { DateRange } from 'react-day-picker';

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
        if (!firestore) return;
    
        // If users have been loaded and there are none, we can stop loading user-specific data.
        if (!isLoadingUsers && userIds.length === 0) {
            // We still need to wait for shared accounts to load.
            if (!isLoadingSharedAccounts) {
                setIsLoading(false);
            }
            return;
        }
    
        // If there are no userIds yet, but users are still loading, just wait.
        if (userIds.length === 0) {
            return;
        }

        setIsLoading(true);
        const subCollections = ['incomes', 'expenses', 'categories', 'checks', 'financialGoals', 'loans', 'payees', 'transfers', 'bankAccounts', 'loanPayments'];
        const unsubs: Unsubscribe[] = [];

        let collectionsLoadedCount = 0;
        const totalCollectionsToLoad = userIds.length * subCollections.length;
        
        let tempData: { [key: string]: any[] } = {};

        userIds.forEach(uid => {
            subCollections.forEach(colName => {
                const q = query(collection(firestore, `users/${uid}/${colName}`));
                const unsub = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as DocumentData[];
                    
                    const userSpecificColKey = `${uid}_${colName}`;
                    tempData[userSpecificColKey] = data;

                    let combinedCollectionData: any[] = [];
                    userIds.forEach(innerUid => {
                        combinedCollectionData = [...combinedCollectionData, ...(tempData[`${innerUid}_${colName}`] || [])];
                    });
                    
                    setAllData(prev => ({ ...prev, [colName]: combinedCollectionData }));
                    
                    collectionsLoadedCount++;
                    if (collectionsLoadedCount >= totalCollectionsToLoad && !isLoadingSharedAccounts) {
                         setIsLoading(false);
                    }
                }, (error) => {
                    console.error(`Error fetching ${colName} for user ${uid}:`, error);
                    collectionsLoadedCount++;
                     if (collectionsLoadedCount >= totalCollectionsToLoad && !isLoadingSharedAccounts) {
                         setIsLoading(false);
                    }
                });
                unsubs.push(unsub);
            });
        });

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [firestore, userIds, isLoadingUsers, isLoadingSharedAccounts]);


    // This effect combines personal and shared bank accounts once they are both loaded.
    useEffect(() => {
        if (isLoadingUsers || isLoadingSharedAccounts) {
            return;
        }

        setAllData(prev => {
            const personalAccounts = prev.bankAccounts || [];
            const combined = [
                ...personalAccounts,
                ...(sharedAccounts || []).map(sa => ({ ...sa, isShared: true }))
            ];
            
            const uniqueAccounts = Array.from(new Map(combined.map(item => [item.id, item])).values());

            return {
                ...prev,
                users: users || [],
                bankAccounts: uniqueAccounts,
            };
        });

        // If all data sources are done loading, ensure main loading is false
        if (userIds.length > 0) {
            // If there are users, the other effect handles loading state
        } else {
            // If no users, loading depends only on users and shared accounts
            setIsLoading(false);
        }

    }, [users, sharedAccounts, isLoadingUsers, isLoadingSharedAccounts, userIds.length]);


    return { isLoading, allData };
};


export function useDashboardData() {
  const { isLoading, allData } = useAllCollections();
  
  const getFilteredData = (ownerFilter: OwnerFilter, dateRange?: DateRange) => {
    
    const dateMatches = (dateStr: string) => {
        if (!dateRange || !dateRange.from || !dateRange.to) return true;
        const itemDate = new Date(dateStr);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };
    
    const aliId = allData.users.find(u => u.email.startsWith('ali'))?.id;
    const fatemehId = allData.users.find(u => u.email.startsWith('fatemeh'))?.id;

    let ownedAccountIds: string[] = [];
    if (ownerFilter === 'all') {
        ownedAccountIds = allData.bankAccounts.map(b => b.id);
    } else if (ownerFilter === 'shared') {
        ownedAccountIds = allData.bankAccounts.filter(b => b.isShared).map(b => b.id);
    } else { // 'ali' or 'fatemeh'
        ownedAccountIds = allData.bankAccounts.filter(b => b.userId === ownerFilter && !b.isShared).map(b => b.id);
    }
    
    const filterByOwner = (item: Income | Expense) => {
        if (ownerFilter === 'all') return true;
        
        const account = allData.bankAccounts.find(ba => ba.id === item.bankAccountId);
        if (ownerFilter === 'shared') {
            return account?.isShared;
        }
        if (ownerFilter === aliId) {
            return account?.userId === aliId && !account.isShared;
        }
        if (ownerFilter === fatemehId) {
            return account?.userId === fatemehId && !account.isShared;
        }
        return false;
    }

    const filteredIncomes = allData.incomes.filter(i => dateMatches(i.date) && filterByOwner(i));
    const filteredExpenses = allData.expenses.filter(e => dateMatches(e.date) && filterByOwner(e));
    
    const totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    
    // Global summaries should not be filtered by date/owner
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
