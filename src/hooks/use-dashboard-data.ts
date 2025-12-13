
'use client';
import { useMemo } from 'react';
import { useFirestore, useCollection, useDoc, useUser } from '@/firebase';
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
  ExpenseFor,
  PreviousDebt,
  DebtPayment,
  UserProfile,
} from '@/lib/types';
import type { DateRange } from 'react-day-picker';
import { USER_DETAILS } from '@/lib/constants';

const FAMILY_DATA_DOC = 'shared-data';

type AllData = {
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
  users: UserProfile[];
};

export type DashboardFilter = 'all' | 'ali' | 'fatemeh' | 'shared' | 'daramad_moshtarak';


export function useDashboardData() {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const collectionsEnabled = !isAuthLoading && !!user && !!firestore;
    
    const usersData = useMemo<UserProfile[]>(() => {
        return [
            {
                id: USER_DETAILS.ali.uid,
                email: USER_DETAILS.ali.email,
                firstName: USER_DETAILS.ali.firstName,
                lastName: USER_DETAILS.ali.lastName,
            },
            {
                id: USER_DETAILS.fatemeh.uid,
                email: USER_DETAILS.fatemeh.email,
                firstName: USER_DETAILS.fatemeh.firstName,
                lastName: USER_DETAILS.fatemeh.lastName,
            }
        ]
    }, []);
    const ilu = false;

    const baseDocRef = useMemo(() => (collectionsEnabled ? doc(firestore, 'family-data', FAMILY_DATA_DOC) : null), [collectionsEnabled, firestore]);

    const bankAccountsCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'bankAccounts') : null, [baseDocRef]);
    const { data: bankAccountsData, isLoading: ilba } = useCollection<BankAccount>(bankAccountsCollectionRef);
    
    const incomesCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'incomes') : null, [baseDocRef]);
    const { data: incomes, isLoading: ili } = useCollection<Income>(incomesCollectionRef);

    const expensesCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'expenses') : null, [baseDocRef]);
    const { data: expenses, isLoading: ile } = useCollection<Expense>(expensesCollectionRef);

    const categoriesCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'categories') : null, [baseDocRef]);
    const { data: categories, isLoading: ilc } = useCollection<Category>(categoriesCollectionRef);

    const checksCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'checks') : null, [baseDocRef]);
    const { data: checks, isLoading: ilch } = useCollection<Check>(checksCollectionRef);

    const goalsCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'financialGoals') : null, [baseDocRef]);
    const { data: goals, isLoading: ilg } = useCollection<FinancialGoal>(goalsCollectionRef);

    const loansCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'loans') : null, [baseDocRef]);
    const { data: loans, isLoading: ill } = useCollection<Loan>(loansCollectionRef);

    const loanPaymentsCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'loanPayments') : null, [baseDocRef]);
    const { data: loanPayments, isLoading: illp } = useCollection<LoanPayment>(loanPaymentsCollectionRef);

    const payeesCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'payees') : null, [baseDocRef]);
    const { data: payees, isLoading: ilp } = useCollection<Payee>(payeesCollectionRef);

    const transfersCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'transfers') : null, [baseDocRef]);
    const { data: transfers, isLoading: ilt } = useCollection<Transfer>(transfersCollectionRef);

    const previousDebtsCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'previousDebts') : null, [baseDocRef]);
    const { data: previousDebts, isLoading: ilpd } = useCollection<PreviousDebt>(previousDebtsCollectionRef);

    const debtPaymentsCollectionRef = useMemo(() => baseDocRef ? collection(baseDocRef, 'debtPayments') : null, [baseDocRef]);
    const { data: debtPayments, isLoading: ildp } = useCollection<DebtPayment>(debtPaymentsCollectionRef);
    
    const isLoading = isAuthLoading || ilba || ili || ile || ilc || ilch || ilg || ill || illp || ilp || ilt || ilpd || ildp || ilu;

    const allData = useMemo<AllData>(() => {
        const rawBankAccounts = bankAccountsData || [];
        const activeGoals = (goals || []).filter(g => !g.isAchieved);
        
        const blockedBalances = activeGoals.flatMap(g => g.contributions).reduce((acc, contribution) => {
            acc[contribution.bankAccountId] = (acc[contribution.bankAccountId] || 0) + contribution.amount;
            return acc;
        }, {} as Record<string, number>);

        const processedBankAccounts = rawBankAccounts.map(acc => ({
            ...acc,
            blockedBalance: blockedBalances[acc.id] || 0,
        }));

        return {
            incomes: incomes || [],
            expenses: expenses || [],
            bankAccounts: processedBankAccounts,
            categories: categories || [],
            checks: checks || [],
            goals: goals || [],
            loans: loans || [],
            payees: payees || [],
            transfers: transfers || [],
            loanPayments: loanPayments || [],
            previousDebts: previousDebts || [],
            debtPayments: debtPayments || [],
            users: usersData,
        };
    }, [bankAccountsData, incomes, expenses, categories, checks, goals, loans, payees, transfers, loanPayments, previousDebts, debtPayments, usersData]);


  const getFilteredData = (ownerFilter: DashboardFilter, dateRange?: DateRange) => {
    
    const dateMatches = (dateStr: string) => {
        if (!dateRange || !dateRange.from || !dateRange.to) return true;
        const itemDate = new Date(dateStr);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };
    
    let filteredIncomes: Income[] = [];
    let filteredExpenses: Expense[] = [];
    let filteredChecks: Check[] = [];
    let filteredLoans: Loan[] = [];
    let filteredDebts: PreviousDebt[] = [];
    let filteredAccounts: BankAccount[] = [];
    let filteredGoals: FinancialGoal[] = [];

    if (ownerFilter === 'all') {
        filteredIncomes = (allData.incomes || []).filter(i => dateMatches(i.date));
        filteredExpenses = (allData.expenses || []).filter(e => dateMatches(e.date));
        filteredAccounts = allData.bankAccounts || [];
        filteredChecks = allData.checks || [];
        filteredLoans = allData.loans || [];
        filteredDebts = allData.previousDebts || [];
        filteredGoals = allData.goals || [];
    } else if (ownerFilter === 'daramad_moshtarak') {
        filteredIncomes = (allData.incomes || []).filter(i => i.ownerId === 'daramad_moshtarak' && dateMatches(i.date));
        filteredAccounts = (allData.bankAccounts || []).filter(b => b.ownerId === 'shared_account');
        // No expenses/liabilities are shown for this business-focused filter
    } else { // 'ali', 'fatemeh', or 'shared' (for expenses/liabilities)
        if (ownerFilter === 'ali' || ownerFilter === 'fatemeh') {
             filteredIncomes = (allData.incomes || []).filter(i => i.ownerId === ownerFilter && dateMatches(i.date));
             filteredAccounts = (allData.bankAccounts || []).filter(b => b.ownerId === ownerFilter);
        }
        filteredExpenses = (allData.expenses || []).filter(e => e.expenseFor === ownerFilter && dateMatches(e.date));
        filteredChecks = (allData.checks || []).filter(c => c.expenseFor === ownerFilter);
        filteredLoans = (allData.loans || []).filter(l => l.ownerId === ownerFilter);
        filteredDebts = (allData.previousDebts || []).filter(d => d.ownerId === ownerFilter);
        filteredGoals = (allData.goals || []).filter(g => g.ownerId === ownerFilter);
    }
    
    const totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    
    const totalAssets = filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalSavedForGoals = filteredGoals.reduce((sum, g) => sum + g.currentAmount, 0);

    const pendingChecks = filteredChecks.filter(c => c.status === 'pending');
    const pendingChecksAmount = pendingChecks.reduce((sum, c) => sum + c.amount, 0);
    
    const remainingLoanAmount = filteredLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    const remainingDebtsAmount = filteredDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

    const totalLiabilities = pendingChecksAmount + remainingLoanAmount + remainingDebtsAmount;
    const netWorth = totalAssets - totalLiabilities;
    
    const allTransactions = [...filteredIncomes, ...filteredExpenses].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    const globalSummary = useMemo(() => {
        return {
            aliBalance: (allData.bankAccounts || []).filter(b => b.ownerId === 'ali').reduce((sum, acc) => sum + acc.balance, 0),
            fatemehBalance: (allData.bankAccounts || []).filter(b => b.ownerId === 'fatemeh').reduce((sum, acc) => sum + acc.balance, 0),
            sharedBalance: (allData.bankAccounts || []).filter(b => b.ownerId === 'shared_account').reduce((sum, acc) => sum + acc.balance, 0),
        };
    }, [allData.bankAccounts]);


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
        totalSavedForGoals,
      },
      globalSummary,
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
