
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
  const { isUserLoading } = useUser();
  const firestore = useFirestore();

  const incomesQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'incomes') : null), [firestore]);
  const expensesQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'expenses') : null), [firestore]);
  const bankAccountsQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'bankAccounts') : null), [firestore]);
  const categoriesQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'categories') : null), [firestore]);
  const checksQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'checks') : null), [firestore]);
  const loansQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'loans') : null), [firestore]);
  const payeesQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'payees') : null), [firestore]);
  const goalsQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'financialGoals') : null), [firestore]);
  const transfersQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'transfers') : null), [firestore]);
  const loanPaymentsQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'loanPayments') : null), [firestore]);
  const previousDebtsQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'previousDebts') : null), [firestore]);
  const debtPaymentsQuery = useMemo(() => (firestore ? collection(firestore, FAMILY_DATA_DOC_PATH, 'debtPayments') : null), [firestore]);
  const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users') : null), [firestore]);


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
  const { data: users, isLoading: ilU } = useCollection<UserProfile>(usersQuery);

  const isLoading = isUserLoading || ilI || ilE || ilBA || ilC || ilCH || ilL || ilP || ilG || ilT || ilLP || ilPD || ilDP || ilU;

  const allUsers = useMemo(() => {
      const firestoreUsers = users || [];
      // Ensure static details are available as a fallback or for enrichment
      const staticUsers: UserProfile[] = Object.values(USER_DETAILS).map(u => ({...u, id: ''})); // ID will be overwritten by firestore data
      
      const combined = [...firestoreUsers];
      staticUsers.forEach(su => {
          if (!combined.some(fu => fu.email === su.email)) {
              combined.push(su);
          }
      });
      return combined;
  }, [users]);


  const allData = useMemo(() => ({
    firestore, // Pass firestore instance for transaction operations
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
    users: allUsers,
  }), [firestore, incomes, expenses, bankAccounts, categories, checks, loans, payees, goals, transfers, loanPayments, previousDebts, debtPayments, allUsers]);

  return { isLoading, allData };
}
