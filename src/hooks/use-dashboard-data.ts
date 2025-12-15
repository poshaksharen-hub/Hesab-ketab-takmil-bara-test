
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { 
    Income, 
    Expense, 
    BankAccount, 
    Category, 
    Check, 
    FinancialGoal, 
    Loan, 
    Payee, 
    Transfer, 
    LoanPayment, 
    PreviousDebt, 
    DebtPayment, 
    UserProfile 
} from '@/lib/types';
import { USER_DETAILS } from '@/lib/constants';

const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

/**
 * A centralized hook to fetch all dashboard-related data.
 * This ensures data is fetched only once and shared across components,
 * preventing redundant reads and potential infinite loops.
 */
export function useDashboardData() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const baseDocRef = useMemo(() => {
    if (isUserLoading || !firestore) return null;
    return doc(firestore, FAMILY_DATA_DOC_PATH);
  }, [firestore, isUserLoading]);
  
  // Directly use static user data instead of fetching from Firestore
  const users: UserProfile[] = useMemo(() => [
      { id: 'ali_placeholder_id', ...USER_DETAILS.ali },
      { id: 'fatemeh_placeholder_id', ...USER_DETAILS.fatemeh }
  ], []);


  const incomesQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'incomes') : null), [baseDocRef]);
  const expensesQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'expenses') : null), [baseDocRef]);
  const bankAccountsQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'bankAccounts') : null), [baseDocRef]);
  const categoriesQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'categories') : null), [baseDocRef]);
  const checksQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'checks') : null), [baseDocRef]);
  const loansQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'loans') : null), [baseDocRef]);
  const payeesQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'payees') : null), [baseDocRef]);
  const goalsQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'financialGoals') : null), [baseDocRef]);
  const transfersQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'transfers') : null), [baseDocRef]);
  const loanPaymentsQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'loanPayments') : null), [baseDocRef]);
  const previousDebtsQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'previousDebts') : null), [baseDocRef]);
  const debtPaymentsQuery = useMemo(() => (baseDocRef ? collection(baseDocRef, 'debtPayments') : null), [baseDocRef]);


  const { data: incomes, isLoading: ilI } = useCollection<Income>(incomesQuery);
  const { data: expenses, isLoading: ilE } = useCollection<Expense>(expensesQuery);
  const { data: bankAccounts, isLoading: ilBA } = useCollection<BankAccount>(bankAccountsQuery);
  const { data: categories, isLoading: ilC } = useCollection<Category>(categoriesQuery);
  const { data: checks, isLoading: ilCH } = useCollection<Check>(checksQuery);
  const { data: loans, isLoading: ilL } = useCollection<Loan>(loansQuery);
  const { data: payees, isLoading: ilP } = useCollection<Payee>(payeesQuery);
  const { data: goals, isLoading: ilG } = useCollection<FinancialGoal>(goalsQuery);
  const { data: transfers, isLoading: ilT } = useCollection<Transfer>(transfersQuery);
  const { data: loanPayments, isLoading: ilLP } = useCollection<LoanPayment>(loanPaymentsQuery);
  const { data: previousDebts, isLoading: ilPD } = useCollection<PreviousDebt>(previousDebtsQuery);
  const { data: debtPayments, isLoading: ilDP } = useCollection<DebtPayment>(debtPaymentsQuery);
  
  // We are no longer loading users from Firestore, so ilU is removed.
  const isLoading = isUserLoading || ilI || ilE || ilBA || ilC || ilCH || ilL || ilP || ilG || ilT || ilLP || ilPD || ilDP;

  const allData = useMemo(() => ({
    firestore,
    incomes: incomes || [],
    expenses: expenses || [],
    bankAccounts: bankAccounts || [],
    categories: categories || [],
    checks: checks || [],
    loans: loans || [],
    payees: payees || [],
    goals: goals || [],
    transfers: transfers || [],
    loanPayments: loanPayments || [],
    previousDebts: previousDebts || [],
    debtPayments: debtPayments || [],
    users: users, // Use the static user data
  }), [firestore, incomes, expenses, bankAccounts, categories, checks, loans, payees, goals, transfers, loanPayments, previousDebts, debtPayments, users]);

  return { isLoading, allData };
}
