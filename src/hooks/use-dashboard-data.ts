
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, DocumentData, query } from 'firebase/firestore';
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
    const { user, isUserLoading: isAuthLoading } = useUser();
    const [allData, setAllData] = useState<AllData>({
        users: [], incomes: [], expenses: [], bankAccounts: [], categories: [], checks: [], 
        goals: [], loans: [], payees: [], transfers: [], loanPayments: []
    });
    const [isLoading, setIsLoading] = useState(true);

    // 1. Fetch all users first
    const usersQuery = useMemoFirebase(
        () => (user ? collection(useFirestore(), 'users') : null),
        [user]
    );
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
    
    const userIds = useMemo(() => (users || []).map(u => u.id), [users]);
    const aliId = useMemo(() => users?.find(u => u.email.startsWith('ali'))?.id, [users]);
    const fatemehId = useMemo(() => users?.find(u => u.email.startsWith('fatemeh'))?.id, [users]);


    // 2. Fetch all shared collections
    const sharedAccountsQuery = useMemoFirebase(() => (user ? query(collection(useFirestore(), 'shared', 'data', 'bankAccounts')) : null), [user]);
    const { data: sharedAccounts, isLoading: isLoadingSharedAccounts } = useCollection<BankAccount>(sharedAccountsQuery);

    const sharedIncomesQuery = useMemoFirebase(() => (user ? query(collection(useFirestore(), 'shared', 'data', 'incomes')) : null), [user]);
    const { data: sharedIncomes, isLoading: isLoadingSharedIncomes } = useCollection<Income>(sharedIncomesQuery);

    const sharedExpensesQuery = useMemoFirebase(() => (user ? query(collection(useFirestore(), 'shared', 'data', 'expenses')) : null), [user]);
    const { data: sharedExpenses, isLoading: isLoadingSharedExpenses } = useCollection<Expense>(sharedExpensesQuery);


    // 3. Fetch all personal collections for each user
    const usePersonalCollections = (userId?: string) => {
        const firestore = useFirestore();
        const enabled = !!userId;

        const incomesQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/incomes`) : null), [enabled, userId]);
        const expensesQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/expenses`) : null), [enabled, userId]);
        const bankAccountsQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/bankAccounts`) : null), [enabled, userId]);
        const categoriesQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/categories`) : null), [enabled, userId]);
        const checksQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/checks`) : null), [enabled, userId]);
        const goalsQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/financialGoals`) : null), [enabled, userId]);
        const loansQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/loans`) : null), [enabled, userId]);
        const loanPaymentsQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/loanPayments`) : null), [enabled, userId]);
        const payeesQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/payees`) : null), [enabled, userId]);
        const transfersQuery = useMemoFirebase(() => (enabled ? collection(firestore, `users/${userId}/transfers`) : null), [enabled, userId]);

        const { data: incomes, isLoading: il } = useCollection<Income>(incomesQuery);
        const { data: expenses, isLoading: el } = useCollection<Expense>(expensesQuery);
        const { data: bankAccounts, isLoading: bl } = useCollection<BankAccount>(bankAccountsQuery);
        const { data: categories, isLoading: cl } = useCollection<Category>(categoriesQuery);
        const { data: checks, isLoading: chl } = useCollection<Check>(checksQuery);
        const { data: goals, isLoading: gl } = useCollection<FinancialGoal>(goalsQuery);
        const { data: loans, isLoading: ll } = useCollection<Loan>(loansQuery);
        const { data: loanPayments, isLoading: lpl } = useCollection<LoanPayment>(loanPaymentsQuery);
        const { data: payees, isLoading: pl } = useCollection<Payee>(payeesQuery);
        const { data: transfers, isLoading: tl } = useCollection<Transfer>(transfersQuery);

        return {
            isLoading: il || el || bl || cl || chl || gl || ll || lpl || pl || tl,
            data: { incomes, expenses, bankAccounts, categories, checks, goals, loans, loanPayments, payees, transfers },
        };
    };
    
    const { data: aliData, isLoading: isLoadingAliData } = usePersonalCollections(aliId);
    const { data: fatemehData, isLoading: isLoadingFatemehData } = usePersonalCollections(fatemehId);


    // 4. Combine all data once everything is loaded
    useEffect(() => {
        const isOverallLoading = isAuthLoading || isLoadingUsers || isLoadingSharedAccounts || isLoadingSharedIncomes || isLoadingSharedExpenses || isLoadingAliData || isLoadingFatemehData;
        setIsLoading(isOverallLoading);

        if (isOverallLoading) return;

        // Helper to combine personal data
        const combinePersonal = <T extends DocumentData>(d1: T[] | null | undefined, d2: T[] | null | undefined): T[] => [
            ...(d1 || []),
            ...(d2 || []),
        ];
        
        const combinedBankAccounts = [
            ...(aliData.bankAccounts || []),
            ...(fatemehData.bankAccounts || []),
            ...(sharedAccounts || []),
        ];
        
        const uniqueAccounts = Array.from(new Map(combinedBankAccounts.map(item => [item.id, item])).values());


        setAllData({
            users: users || [],
            bankAccounts: uniqueAccounts,
            incomes: combinePersonal(aliData.incomes, fatemehData.incomes).concat(sharedIncomes || []),
            expenses: combinePersonal(aliData.expenses, fatemehData.expenses).concat(sharedExpenses || []),
            categories: combinePersonal(aliData.categories, fatemehData.categories),
            checks: combinePersonal(aliData.checks, fatemehData.checks),
            goals: combinePersonal(aliData.goals, fatemehData.goals),
            loans: combinePersonal(aliData.loans, fatemehData.loans),
            loanPayments: combinePersonal(aliData.loanPayments, fatemehData.loanPayments),
            payees: combinePersonal(aliData.payees, fatemehData.payees),
            transfers: combinePersonal(aliData.transfers, fatemehData.transfers),
        });

    }, [
        isAuthLoading, isLoadingUsers, 
        isLoadingSharedAccounts, isLoadingSharedIncomes, isLoadingSharedExpenses,
        isLoadingAliData, isLoadingFatemehData,
        users, sharedAccounts, sharedIncomes, sharedExpenses,
        aliData, fatemehData
    ]);


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
            return !!account?.isShared;
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
