'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
import { getDateRange } from '@/lib/date-utils';

export type DateRange = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear';

interface FinancialSummaryProps {
  dateRange: DateRange;
}

const aliEmailKey = 'ali';
const fatemehEmailKey = 'fatemeh';


export function useFinancialSummary({ dateRange }: FinancialSummaryProps) {
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

  useEffect(() => {
    if (!firestore || isUserLoading) return;
    
    const fetchData = async () => {
      setIsLoading(true);

      // Fetch users first to get their IDs
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const userProfiles = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
      setUsers(userProfiles);
      const userIds = userProfiles.map(u => u.id);

      if (userIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch all collections for all users
      const collectionsToFetch = [
        { name: 'incomes', setter: setIncomes },
        { name: 'expenses', setter: setExpenses },
        { name: 'bankAccounts', setter: setBankAccounts, isPersonal: true },
        { name: 'categories', setter: setCategories },
        { name: 'checks', setter: setChecks },
        { name: 'financialGoals', setter: setGoals },
        { name: 'loans', setter: setLoans },
        { name: 'payees', setter: setPayees },
      ];

      const allPromises = collectionsToFetch.map(async (col) => {
        const userDocsPromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, col.name)));
        const userDocsSnapshots = await Promise.all(userDocsPromises);
        let items: any[] = [];
        userDocsSnapshots.forEach((snapshot, index) => {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const item: any = { ...data, id: doc.id };
                if (col.isPersonal) {
                    item.userId = userIds[index];
                }
                items.push(item);
            });
        });
        col.setter(items);
      });

      // Fetch shared bank accounts
      const sharedAccountsPromise = getDocs(collection(firestore, 'shared/data/bankAccounts')).then(snapshot => {
          const sharedItems = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, isShared: true } as BankAccount));
          setBankAccounts(prev => [...prev, ...sharedItems]);
      });

      await Promise.all([...allPromises, sharedAccountsPromise]);

      setIsLoading(false);
    };

    fetchData();

  }, [firestore, isUserLoading]);

  const summary = useMemo(() => {
    const aliUser = users.find(u => u.email.startsWith(aliEmailKey));
    const fatemehUser = users.find(u => u.email.startsWith(fatemehEmailKey));

    const { from: fromDate, to: toDate } = getDateRange(dateRange);

    const filterByDate = <T extends { date: string }>(items: T[]): T[] => {
        return items.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= fromDate && itemDate <= toDate;
        });
    };
    
    const filteredExpenses = filterByDate(expenses);
    const filteredIncomes = filterByDate(incomes);

    const totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    
    const aliTotalBalance = bankAccounts
        .filter(acc => !acc.isShared && acc.userId === aliUser?.id)
        .reduce((sum, acc) => sum + acc.balance, 0);
    
    const fatemehTotalBalance = bankAccounts
        .filter(acc => !acc.isShared && acc.userId === fatemehUser?.id)
        .reduce((sum, acc) => sum + acc.balance, 0);

    const sharedTotalBalance = bankAccounts
        .filter(acc => acc.isShared)
        .reduce((sum, acc) => sum + acc.balance, 0);

    const totalAssets = aliTotalBalance + fatemehTotalBalance + sharedTotalBalance;

    const pendingChecksAmount = checks
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);
    
    const remainingLoanAmount = loans.reduce((sum, l) => sum + l.remainingAmount, 0);

    const totalLiabilities = pendingChecksAmount + remainingLoanAmount;

    const netWorth = totalAssets - totalLiabilities;
    
    const allTransactions = [...incomes, ...expenses].sort((a,b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    return {
      totalIncome,
      totalExpense,
      netWorth,
      totalAssets,
      totalLiabilities,
      aliTotalBalance,
      fatemehTotalBalance,
      sharedTotalBalance,
      recentTransactions: allTransactions.slice(0, 5),
      // Raw data for other components
      expenses: filteredExpenses,
      incomes: filteredIncomes,
      checks,
      loans,
      payees,
      categories,
      users,
    };
  }, [dateRange, users, incomes, expenses, bankAccounts, categories, checks, goals, loans, payees]);

  return { summary, isLoading };
}
