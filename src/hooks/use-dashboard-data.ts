'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  Transfer
} from '@/lib/types';
import { USER_DETAILS } from '@/lib/constants';

export type OwnerFilter = 'all' | string | 'shared';

export function useDashboardData() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!firestore || isUserLoading) {
        if(!isUserLoading) {
            setIsLoading(false);
        }
        return;
    };
    
    setIsLoading(true);

    const fetchData = async () => {
      
      try {
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const userProfiles = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
        setUsers(userProfiles);
        const userIds = userProfiles.map(u => u.id);

        if (userIds.length === 0) {
            setIsLoading(false);
            return;
        }
        
        const collectionsToFetch = [
            { name: 'incomes', setter: setIncomes },
            { name: 'expenses', setter: setExpenses },
            { name: 'categories', setter: setCategories },
            { name: 'checks', setter: setChecks },
            { name: 'financialGoals', setter: setGoals },
            { name: 'loans', setter: setLoans },
            { name: 'payees', setter: setPayees },
            { name: 'transfers', setter: setTransfers },
        ];

        const allDataPromises: Promise<any>[] = [];

        // Fetch personal bank accounts
        userIds.forEach(uid => {
            const personalAccountsQuery = getDocs(collection(firestore, 'users', uid, 'bankAccounts'));
            allDataPromises.push(personalAccountsQuery);
        });

        // Fetch all other collections for all users
        collectionsToFetch.forEach(col => {
            userIds.forEach(uid => {
                const collectionQuery = getDocs(collection(firestore, 'users', uid, col.name));
                allDataPromises.push(collectionQuery);
            });
        });
        
        // Fetch shared bank accounts
        const sharedAccountsQuery = getDocs(collection(firestore, 'shared/data/bankAccounts'));
        allDataPromises.push(sharedAccountsQuery);
        
        const allSnapshots = await Promise.all(allDataPromises);

        let snapshotIndex = 0;
        
        const personalAccounts: BankAccount[] = [];
        for(let i = 0; i < userIds.length; i++) {
            const personalAccountSnapshot = allSnapshots[snapshotIndex++];
            personalAccountSnapshot.docs.forEach((doc: any) => {
                personalAccounts.push({ ...(doc.data() as Omit<BankAccount, 'id'>), id: doc.id, userId: userIds[i] });
            });
        }

        collectionsToFetch.forEach(col => {
            const items: any[] = [];
            for(let i = 0; i < userIds.length; i++) {
                const userDocsSnapshot = allSnapshots[snapshotIndex++];
                userDocsSnapshot.docs.forEach((doc: any) => {
                    items.push({ ...doc.data(), id: doc.id });
                });
            }
            col.setter(items);
        });

        const sharedAccountsSnapshot = allSnapshots[snapshotIndex];
        const sharedAccounts = sharedAccountsSnapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id, isShared: true } as BankAccount));
        
        setBankAccounts([...personalAccounts, ...sharedAccounts]);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

  }, [firestore, isUserLoading]);

  const getFilteredData = (dateRange?: { from: Date, to: Date }, ownerFilter: OwnerFilter = 'all') => {
    
    const dateMatches = (dateStr: string) => {
        if (!dateRange || !dateRange.from || !dateRange.to) return true;
        const itemDate = new Date(dateStr);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };
    
    // Determine if a transaction is shared
    const isSharedTx = (tx: Income | Expense) => {
      const account = bankAccounts.find(acc => acc.id === tx.bankAccountId);
      return account?.isShared || false;
    };

    const getOwnerId = (item: { userId?: string, bankAccountId?: string }) => {
        if (item.bankAccountId) {
            const account = bankAccounts.find(ba => ba.id === item.bankAccountId);
            if (account?.isShared) return 'shared';
            return account?.userId;
        }
        return item.userId;
    };
    
    let filteredIncomes = incomes.filter(i => dateMatches(i.date));
    let filteredExpenses = expenses.filter(e => dateMatches(e.date));

    // Calculate totals based on the new logic
    let totalIncome = 0;
    let totalExpense = 0;
    
    if (ownerFilter === 'all') {
        totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
        totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    } else if (ownerFilter === 'shared') {
        totalIncome = filteredIncomes.filter(isSharedTx).reduce((sum, item) => sum + item.amount, 0);
        totalExpense = filteredExpenses.filter(isSharedTx).reduce((sum, item) => sum + item.amount, 0);
        filteredIncomes = filteredIncomes.filter(isSharedTx);
        filteredExpenses = filteredExpenses.filter(isSharedTx);
    } else { // Personal filter (e.g., 'ali' or 'fatemeh')
        // Personal transactions
        const personalIncomes = filteredIncomes.filter(i => !isSharedTx(i) && getOwnerId(i) === ownerFilter);
        const personalExpenses = filteredExpenses.filter(e => !isSharedTx(e) && getOwnerId(e) === ownerFilter);
        
        // Shared transactions (50% contribution)
        const sharedIncomes = filteredIncomes.filter(isSharedTx);
        const sharedExpenses = filteredExpenses.filter(isSharedTx);

        totalIncome = personalIncomes.reduce((sum, i) => sum + i.amount, 0) + 
                      sharedIncomes.reduce((sum, i) => sum + i.amount * 0.5, 0);
        
        totalExpense = personalExpenses.reduce((sum, e) => sum + e.amount, 0) +
                       sharedExpenses.reduce((sum, e) => sum + e.amount * 0.5, 0);

        // For display in data tables, we show personal tx + shared tx
        filteredIncomes = [...personalIncomes, ...sharedIncomes];
        filteredExpenses = [...personalExpenses, ...sharedExpenses];
    }
    
    // Filter other data types based on owner
    const ownerMatches = (item: any) => {
        const ownerId = getOwnerId(item);
        if (ownerFilter === 'all') return true;
        if (ownerFilter === 'shared') return ownerId === 'shared';
        return ownerId === ownerFilter;
    };
    
    const filteredBankAccounts = bankAccounts.filter(ownerMatches);
    const filteredChecks = checks.filter(ownerMatches);
    const filteredLoans = loans.filter(ownerMatches);
    const filteredGoals = goals.filter(ownerMatches);


    const totalAssets = filteredBankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const pendingChecksAmount = filteredChecks
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);
    
    const remainingLoanAmount = filteredLoans.reduce((sum, l) => sum + l.remainingAmount, 0);

    const totalLiabilities = pendingChecksAmount + remainingLoanAmount;

    const netWorth = totalAssets - totalLiabilities;
    
    const allTransactions = [...incomes, ...expenses].sort((a, b) => {
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
        checks: filteredChecks,
        loans: filteredLoans,
        goals: filteredGoals,
        transactions: allTransactions, // Show all recent tx on dashboard, regardless of filter
        payees,
        categories,
        users,
        bankAccounts: filteredBankAccounts,
      },
      allData: { users, incomes, expenses, bankAccounts, categories, checks, goals, loans, payees, transfers }
    };
  };

  return { 
    isLoading, 
    getFilteredData, 
    allData: { users, incomes, expenses, bankAccounts, categories, checks, goals, loans, payees, transfers }
  };
}
