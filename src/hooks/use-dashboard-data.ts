
'use client';
import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
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
  OwnerId,
  PreviousDebt,
  DebtPayment,
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
  previousDebts: PreviousDebt[];
  debtPayments: DebtPayment[];
};

export function useDashboardData() {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const collectionsEnabled = !isAuthLoading && !!firestore;

    const baseDocRef = useMemoFirebase(() => (collectionsEnabled ? doc(firestore, 'family-data', FAMILY_DATA_DOC) : null), [collectionsEnabled, firestore]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(useMemoFirebase(() => (collectionsEnabled ? collection(firestore, 'users') : null), [collectionsEnabled, firestore]));
    const { data: bankAccounts, isLoading: ilba } = useCollection<BankAccount>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'bankAccounts') : null), [baseDocRef]));
    const { data: incomes, isLoading: ili } = useCollection<Income>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'incomes') : null), [baseDocRef]));
    const { data: expenses, isLoading: ile } = useCollection<Expense>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'expenses') : null), [baseDocRef]));
    const { data: categories, isLoading: ilc } = useCollection<Category>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'categories') : null), [baseDocRef]));
    const { data: checks, isLoading: ilch } = useCollection<Check>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'checks') : null), [baseDocRef]));
    const { data: goals, isLoading: ilg } = useCollection<FinancialGoal>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'financialGoals') : null), [baseDocRef]));
    const { data: loans, isLoading: ill } = useCollection<Loan>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'loans') : null), [baseDocRef]));
    const { data: loanPayments, isLoading: illp } = useCollection<LoanPayment>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'loanPayments') : null), [baseDocRef]));
    const { data: payees, isLoading: ilp } = useCollection<Payee>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'payees') : null), [baseDocRef]));
    const { data: transfers, isLoading: ilt } = useCollection<Transfer>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'transfers') : null), [baseDocRef]));
    const { data: previousDebts, isLoading: ilpd } = useCollection<PreviousDebt>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'previousDebts') : null), [baseDocRef]));
    const { data: debtPayments, isLoading: ildp } = useCollection<DebtPayment>(useMemoFirebase(() => (baseDocRef ? collection(baseDocRef, 'debtPayments') : null), [baseDocRef]));
    
    const isLoading = isAuthLoading || isLoadingUsers || ilba || ili || ile || ilc || ilch || ilg || ill || illp || ilp || ilt || ilpd || ildp;

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
        previousDebts: previousDebts || [],
        debtPayments: debtPayments || [],
    }), [users, bankAccounts, incomes, expenses, categories, checks, goals, loans, payees, transfers, loanPayments, previousDebts, debtPayments]);


  const getFilteredData = (ownerFilter: OwnerId | 'all', dateRange?: DateRange) => {
    
    const dateMatches = (dateStr: string) => {
        if (!dateRange || !dateRange.from || !dateRange.to) return true;
        const itemDate = new Date(dateStr);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };
    
    const filterByOwner = <T extends { ownerId: OwnerId }>(item: T) => {
        if (ownerFilter === 'all') return true;
        return item.ownerId === ownerFilter;
    };

    const filteredIncomes = allData.incomes.filter(i => dateMatches(i.date) && filterByOwner(i));
    const filteredExpenses = allData.expenses.filter(e => dateMatches(e.date) && filterByOwner(e));
    
    const totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    
    const filteredAccounts = allData.bankAccounts.filter(filterByOwner);
    const totalAssets = ownerFilter === 'all' 
        ? allData.bankAccounts.reduce((sum, acc) => sum + acc.balance, 0)
        : filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const pendingChecks = allData.checks.filter(c => c.status === 'pending' && filterByOwner(c));
    const pendingChecksAmount = pendingChecks.reduce((sum, c) => sum + c.amount, 0);
    
    const remainingLoanAmount = allData.loans.filter(filterByOwner).reduce((sum, l) => sum + l.remainingAmount, 0);
    const remainingDebtsAmount = allData.previousDebts.filter(filterByOwner).reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalLiabilities = pendingChecksAmount + remainingLoanAmount + remainingDebtsAmount;
    const netWorth = totalAssets - totalLiabilities;
    
    const allTransactions = [...filteredIncomes, ...filteredExpenses].sort((a, b) => {
        const dateA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate() : new Date(a.date);
        const dateB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    // Balances are always calculated globally, not affected by date/owner filter for display
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
        pendingChecksAmount,
        remainingLoanAmount,
        remainingDebtsAmount,
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

    