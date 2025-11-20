
'use client';
import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
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
  OwnerId
} from '@/lib/types';
import type { DateRange } from 'react-day-picker';
import { USER_DETAILS } from '@/lib/constants';

const FAMILY_DATA_DOC = 'shared-data';

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

export function useDashboardData() {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const collectionsEnabled = !isAuthLoading && !!firestore;

    // Fetch all users
    const usersQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'users') : null), [collectionsEnabled, firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

    // Fetch all family-level data from the central location
    const bankAccountsQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'bankAccounts') : null), [collectionsEnabled, firestore]);
    const incomesQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'incomes') : null), [collectionsEnabled, firestore]);
    const expensesQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'expenses') : null), [collectionsEnabled, firestore]);
    const categoriesQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'categories') : null), [collectionsEnabled, firestore]);
    const checksQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'checks') : null), [collectionsEnabled, firestore]);
    const goalsQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'financialGoals') : null), [collectionsEnabled, firestore]);
    const loansQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'loans') : null), [collectionsEnabled, firestore]);
    const loanPaymentsQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'loanPayments') : null), [collectionsEnabled, firestore]);
    const payeesQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'payees') : null), [collectionsEnabled, firestore]);
    const transfersQuery = useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'family-data', FAMILY_DATA_DOC, 'transfers') : null), [collectionsEnabled, firestore]);
    
    const { data: bankAccounts, isLoading: ilba } = useCollection<BankAccount>(bankAccountsQuery);
    const { data: incomes, isLoading: ili } = useCollection<Income>(incomesQuery);
    const { data: expenses, isLoading: ile } = useCollection<Expense>(expensesQuery);
    const { data: categories, isLoading: ilc } = useCollection<Category>(categoriesQuery);
    const { data: checks, isLoading: ilch } = useCollection<Check>(checksQuery);
    const { data: goals, isLoading: ilg } = useCollection<FinancialGoal>(goalsQuery);
    const { data: loans, isLoading: ill } = useCollection<Loan>(loansQuery);
    const { data: loanPayments, isLoading: illp } = useCollection<LoanPayment>(loanPaymentsQuery);
    const { data: payees, isLoading: ilp } = useCollection<Payee>(payeesQuery);
    const { data: transfers, isLoading: ilt } = useCollection<Transfer>(transfersQuery);

    const isLoading = isAuthLoading || isLoadingUsers || ilba || ili || ile || ilc || ilch || ilg || ill || illp || ilp || ilt;

    const allData = useMemo<AllData>(() => ({
        users: users || [],
        incomes: incomes || [],
        expenses: expenses || [],
        bankAccounts: bankAccounts || [],
        categories: categories || [],
        checks: checks || [],
        goals: goals || [],
        loans: loans || [],
        payees: payees || [],
        transfers: transfers || [],
        loanPayments: loanPayments || [],
    }), [users, bankAccounts, incomes, expenses, categories, checks, goals, loans, payees, transfers, loanPayments]);


  const getFilteredData = (ownerFilter: OwnerId | 'all', dateRange?: DateRange) => {
    
    const dateMatches = (dateStr: string) => {
        if (!dateRange || !dateRange.from || !dateRange.to) return true;
        const itemDate = new Date(dateStr);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };
    
    const filterByOwner = (item: Income | Expense) => {
        if (ownerFilter === 'all') return true;
        return item.ownerId === ownerFilter;
    }

    const filteredIncomes = allData.incomes.filter(i => dateMatches(i.date) && filterByOwner(i));
    const filteredExpenses = allData.expenses.filter(e => dateMatches(e.date) && filterByOwner(e));
    
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
        const dateA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate() : new Date(a.date);
        const dateB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    const aliBalance = allData.bankAccounts.filter(b => b.ownerId === 'ali').reduce((sum, acc) => sum + acc.balance, 0);
    const fatemehBalance = allData.bankAccounts.filter(b => b.ownerId === 'fatemeh').reduce((sum, acc) => sum + acc.balance, 0);
    const sharedBalance = allData.bankAccounts.filter(b => b.ownerId === 'shared').reduce((sum, acc) => sum + acc.balance, 0);

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
