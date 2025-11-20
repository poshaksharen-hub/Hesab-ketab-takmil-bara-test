'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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

        const checkLoadingDone = () => {
            if (collectionsLoaded === totalCollectionsToLoad) {
                setIsLoading(false);
            }
        };

        subCollections.forEach(colName => {
            userIds.forEach(uid => {
                const q = query(collection(firestore, `users/${uid}/${colName}`));
                const unsub = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, userId: uid })) as DocumentData[];
                    setAllData(prev => {
                        const currentCollection = (prev as any)[colName] || [];
                        const otherUserData = currentCollection.filter((item: any) => item.userId !== uid);
                        return { ...prev, [colName]: [...otherUserData, ...data] };
                    });
                    if (unsubs.length > collectionsLoaded) collectionsLoaded++;
                    checkLoadingDone();
                }, (error) => {
                    console.error(`Error fetching ${colName} for user ${uid}:`, error);
                     if (unsubs.length > collectionsLoaded) collectionsLoaded++;
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
        if (isLoadingUsers || isLoadingSharedAccounts) return;
        
        const personalAccounts = allData.bankAccounts.filter(b => !b.isShared);
        const combinedAccounts = [
            ...personalAccounts,
            ...(sharedAccounts || []).map(sa => ({ ...sa, isShared: true }))
        ];

        setAllData(prev => ({
            ...prev,
            users: users || [],
            bankAccounts: combinedAccounts,
        }));

    }, [sharedAccounts, allData.bankAccounts, users, isLoadingUsers, isLoadingSharedAccounts]);

    return { isLoading, allData };
};


export function useDashboardData() {
  const { isLoading, allData } = useAllCollections();
  
  const { users, bankAccounts, incomes, expenses, checks, loans, categories, payees, goals, transfers } = allData;

  const getFilteredData = (dateRange?: { from: Date, to: Date }, ownerFilter: OwnerFilter = 'all') => {
    
    const dateMatches = (dateStr: string) => {
        if (!dateRange || !dateRange.from || !dateRange.to) return true;
        const itemDate = new Date(dateStr);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };
    
    const isSharedTx = (tx: Income | Expense) => {
      const account = bankAccounts.find(acc => acc.id === tx.bankAccountId);
      return account?.isShared || false;
    };

    const getOwnerId = (item: { userId?: string, bankAccountId?: string, isShared?: boolean }) => {
        if (item.isShared) return 'shared';

        const account = item.bankAccountId ? bankAccounts.find(ba => ba.id === item.bankAccountId) : null;
        if (account) {
            return account.userId;
        }
        return item.userId;
    };
    
    let filteredIncomes = incomes.filter(i => dateMatches(i.date));
    let filteredExpenses = expenses.filter(e => dateMatches(e.date));

    let totalIncome = 0;
    let totalExpense = 0;
    
    if (ownerFilter === 'all') {
        totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
        totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    } else if (ownerFilter === 'shared') {
        filteredIncomes = filteredIncomes.filter(isSharedTx);
        filteredExpenses = filteredExpenses.filter(isSharedTx);
        totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
        totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    } else { 
        const personalIncomes = filteredIncomes.filter(i => !isSharedTx(i) && getOwnerId(i) === ownerFilter);
        const personalExpenses = filteredExpenses.filter(e => !isSharedTx(e) && getOwnerId(e) === ownerFilter);
        
        // In personal view, we show their personal tx + half of shared tx
        const sharedIncomes = filteredIncomes.filter(isSharedTx);
        const sharedExpenses = filteredExpenses.filter(isSharedTx);

        totalIncome = personalIncomes.reduce((sum, i) => sum + i.amount, 0) + 
                      sharedIncomes.reduce((sum, i) => sum + i.amount * 0.5, 0);
        
        totalExpense = personalExpenses.reduce((sum, e) => sum + e.amount, 0) +
                       sharedExpenses.reduce((sum, e) => sum + e.amount * 0.5, 0);

        // The list should contain personal tx and all shared tx
        filteredIncomes = [...personalIncomes, ...sharedIncomes];
        filteredExpenses = [...personalExpenses, ...sharedExpenses];
    }
    
    const ownerMatches = (item: any) => {
        const ownerId = getOwnerId(item);
        if (ownerFilter === 'all') return true;
        if (ownerFilter === 'shared') return item.isShared;
        return ownerId === ownerFilter && !item.isShared;
    };
    
    const filteredBankAccounts = bankAccounts.filter(ownerMatches);
    const filteredChecks = checks.filter(c => getOwnerId(c) === ownerFilter || ownerFilter === 'all');
    const filteredLoans = loans.filter(l => getOwnerId(l) === ownerFilter || ownerFilter === 'all');
    const filteredGoals = goals.filter(g => getOwnerId(g) === ownerFilter || ownerFilter === 'all');

    const totalAssets = filteredBankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const pendingChecksAmount = filteredChecks
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);
    
    const remainingLoanAmount = filteredLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    const totalLiabilities = pendingChecksAmount + remainingLoanAmount;
    const netWorth = totalAssets - totalLiabilities;
    
    const allTransactions = [...filteredIncomes, ...filteredExpenses].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    const aliId = users.find(u => u.email.startsWith('ali'))?.id;
    const fatemehId = users.find(u => u.email.startsWith('fatemeh'))?.id;
    
    const aliBalance = bankAccounts.filter(b => b.userId === aliId && !b.isShared).reduce((sum, acc) => sum + acc.balance, 0);
    const fatemehBalance = bankAccounts.filter(b => b.userId === fatemehId && !b.isShared).reduce((sum, acc) => sum + acc.balance, 0);
    const sharedBalance = bankAccounts.filter(b => b.isShared).reduce((sum, acc) => sum + acc.balance, 0);

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
        checks: allData.checks, // Show all checks/loans/etc. in detail views
        loans: allData.loans,
        goals: allData.goals,
        transactions: allTransactions,
        payees,
        categories,
        users,
        bankAccounts: allData.bankAccounts, // Pass all accounts to detail views for lookups
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
