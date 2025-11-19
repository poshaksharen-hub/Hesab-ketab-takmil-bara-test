'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type {
  Income,
  Expense,
  BankAccount,
  UserProfile,
  Category,
  Check,
  FinancialGoal,
  Loan,
  Payee
} from '@/lib/types';
import { USER_DETAILS } from '@/lib/constants';

export type OwnerFilter = 'all' | 'ali' | 'fatemeh' | 'shared';

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
  
  const [isLoading, setIsLoading] = useState(true);
  
  const aliUser = useMemo(() => users.find(u => u.email.startsWith('ali')), [users]);
  const fatemehUser = useMemo(() => users.find(u => u.email.startsWith('fatemeh')), [users]);

  useEffect(() => {
    if (!firestore || isUserLoading) return;
    
    const fetchData = async () => {
      setIsLoading(true);

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
      ];
      
      const personalAccounts: BankAccount[] = [];
      const personalAccountPromises = userIds.map(async (uid) => {
        const snapshot = await getDocs(collection(firestore, 'users', uid, 'bankAccounts'));
        snapshot.docs.forEach(doc => {
            personalAccounts.push({ ...(doc.data() as Omit<BankAccount, 'id'>), id: doc.id, userId: uid });
        });
      });


      const collectionPromises = collectionsToFetch.map(async (col) => {
        const userDocsPromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, col.name)));
        const userDocsSnapshots = await Promise.all(userDocsPromises);
        const items = userDocsSnapshots.flat().map(snapshot => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any))).flat();
        col.setter(items);
      });

      const sharedAccountsPromise = getDocs(collection(firestore, 'shared/data/bankAccounts')).then(snapshot => {
          return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, isShared: true } as BankAccount));
      });

      const [sharedAccounts, ..._] = await Promise.all([sharedAccountsPromise, ...collectionPromises, ...personalAccountPromises]);
      
      setBankAccounts([...personalAccounts, ...sharedAccounts]);

      setIsLoading(false);
    };

    fetchData();

  }, [firestore, isUserLoading]);

  const getFilteredData = (dateRange?: { from: Date, to: Date }, ownerFilter: OwnerFilter = 'all') => {
    
    const aliId = aliUser?.id;
    const fatemehId = fatemehUser?.id;
    
    const getOwnerId = (item: { userId?: string, bankAccountId?: string, isShared?: boolean }) => {
        if ('isShared' in item && item.isShared) return 'shared';
        if (item.userId) return item.userId;
        if (item.bankAccountId) {
            const account = bankAccounts.find(ba => ba.id === item.bankAccountId);
            return account?.isShared ? 'shared' : account?.userId;
        }
        return undefined;
    };

    const ownerMatches = (item: any) => {
      const ownerId = getOwnerId(item);
      if (ownerFilter === 'all') return true;
      if (ownerFilter === 'shared' && ownerId === 'shared') return true;
      if (ownerFilter === aliId && ownerId === aliId) return true;
      if (ownerFilter === fatemehId && ownerId === fatemehId) return true;
      return false;
    };

    const dateMatches = (dateStr: string) => {
        if (!dateRange || !dateRange.from || !dateRange.to) return true;
        const itemDate = new Date(dateStr);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };

    const filteredIncomes = incomes.filter(i => dateMatches(i.date) && ownerMatches(i));
    const filteredExpenses = expenses.filter(e => dateMatches(e.date) && ownerMatches(e));
    const filteredGoals = goals.filter(g => ownerMatches(g));
    const filteredChecks = checks.filter(c => ownerMatches(c));
    const filteredLoans = loans.filter(l => ownerMatches(l));


    const totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    
    const totalAssets = bankAccounts
        .filter(ownerMatches)
        .reduce((sum, acc) => sum + acc.balance, 0);

    const pendingChecksAmount = filteredChecks
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);
    
    const remainingLoanAmount = filteredLoans.reduce((sum, l) => sum + l.remainingAmount, 0);

    const totalLiabilities = pendingChecksAmount + remainingLoanAmount;

    const netWorth = totalAssets - totalLiabilities;
    
    const allTransactions = [...incomes, ...expenses].sort((a,b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });
    
    const filteredTransactions = allTransactions.filter(t => {
      const tDate = 'createdAt' in t ? t.createdAt : t.date;
      return dateMatches(tDate) && ownerMatches(t)
    });


    return {
      summary: {
        totalIncome,
        totalExpense,
        netWorth,
        totalAssets,
        totalLiabilities,
      },
      details: {
        incomes: filteredIncomes,
        expenses: filteredExpenses,
        checks: filteredChecks,
        loans: filteredLoans,
        goals: filteredGoals,
        transactions: filteredTransactions,
        payees,
        categories,
        users,
        bankAccounts: bankAccounts.filter(ownerMatches),
      },
      allData: { users, incomes, expenses, bankAccounts, categories, checks, goals, loans, payees }
    };
  };

  return { 
    isLoading, 
    getFilteredData, 
    allData: { users, incomes, expenses, bankAccounts, categories, checks, goals, loans, payees }
  };
}
