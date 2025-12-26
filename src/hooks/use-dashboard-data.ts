
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/firebase';
import { supabase } from '@/lib/supabase-client';
import type { 
    BankAccount, 
    Income, 
    Expense, 
    Category, 
    Payee, 
    Check, 
    FinancialGoal, 
    Loan, 
    LoanPayment,
    PreviousDebt,
    DebtPayment,
    Transfer,
    UserProfile,
    ChatMessage
} from '@/lib/types';

// Maps Supabase snake_case columns to our camelCase types
const transformData = (data: any[]) => {
    if (!data) return [];
    return data.map(item => {
        const newItem: { [key: string]: any } = {};
        for (const key in item) {
            const camelCaseKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            newItem[camelCaseKey] = item[key];
        }
        return newItem;
    });
};


export function useDashboardData() {
  const { user } = useUser();
  const [allData, setAllData] = useState<any>({
    bankAccounts: [],
    incomes: [],
    expenses: [],
    transfers: [],
    checks: [],
    loans: [],
    loanPayments: [],
    previousDebts: [],
    debtPayments: [],
    goals: [],
    categories: [],
    payees: [],
    users: [],
    chatMessages: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    };

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use an RPC call to a secure function to get all users
        const usersRes = await supabase.rpc('get_all_users');

        const [
          bankAccountsRes,
          categoriesRes,
          payeesRes,
          expensesRes,
          incomesRes,
          transfersRes,
          checksRes,
          goalsRes,
          loansRes,
          loanPaymentsRes,
          debtsRes,
          debtPaymentsRes,
          chatMessagesRes,
        ] = await Promise.all([
          supabase.from('bank_accounts').select('*').eq('is_deleted', false),
          supabase.from('categories').select('*').eq('is_archived', false),
          supabase.from('payees').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('incomes').select('*'),
          supabase.from('transfers').select('*'),
          supabase.from('cheques').select('*'),
          supabase.from('financial_goals').select('*'),
          supabase.from('loans').select('*'),
          supabase.from('loan_payments').select('*'),
          supabase.from('debts').select('*'),
          supabase.from('debt_payments').select('*'),
          supabase.from('chat_messages').select('*').order('timestamp', { ascending: true }),
        ]);

        // Check for errors in each response
        const responses = [
          { name: 'users', ...usersRes },
          { name: 'bank_accounts', ...bankAccountsRes },
          { name: 'categories', ...categoriesRes },
          { name: 'payees', ...payeesRes },
          { name: 'expenses', ...expensesRes },
          { name: 'incomes', ...incomesRes },
          { name: 'transfers', ...transfersRes },
          { name: 'checks', ...checksRes },
          { name: 'financial_goals', ...goalsRes },
          { name: 'loans', ...loansRes },
          { name: 'loan_payments', ...loanPaymentsRes },
          { name: 'debts', ...debtsRes },
          { name: 'debt_payments', ...debtPaymentsRes },
          { name: 'chat_messages', ...chatMessagesRes },
        ];

        for (const res of responses) {
          if (res.error) {
            console.error(`Error fetching ${res.name}:`, res.error);
            throw new Error(`Failed to fetch data for ${res.name}: ${res.error.message}`);
          }
        }
        
        // Manual mapping for financial_goals contributions for now
        const goalsData = transformData(goalsRes.data || []);
        const expensesData = transformData(expensesRes.data || []) as Expense[];
        
        const goalsWithContributions = goalsData.map((goal: FinancialGoal) => {
            const contributions = expensesData
                .filter(expense => expense.subType === 'goal_contribution' && expense.goalId === goal.id)
                .map(expense => ({
                    id: expense.id,
                    bankAccountId: expense.bankAccountId,
                    amount: expense.amount,
                    date: expense.date,
                    registeredByUserId: expense.registeredByUserId,
                }));
            return { ...goal, contributions };
        });


        setAllData({
          firestore: supabase, // For compatibility with existing code that expects a 'firestore' object
          users: transformData(usersRes.data || []) as UserProfile[],
          bankAccounts: transformData(bankAccountsRes.data || []) as BankAccount[],
          categories: transformData(categoriesRes.data || []) as Category[],
          payees: transformData(payeesRes.data || []) as Payee[],
          expenses: expensesData,
          incomes: transformData(incomesRes.data || []) as Income[],
          transfers: transformData(transfersRes.data || []) as Transfer[],
          checks: transformData(checksRes.data || []) as Check[],
          goals: goalsWithContributions,
          loans: transformData(loansRes.data || []) as Loan[],
          loanPayments: transformData(loanPaymentsRes.data || []) as LoanPayment[],
          previousDebts: transformData(debtsRes.data || []) as PreviousDebt[],
          debtPayments: transformData(debtPaymentsRes.data || []) as DebtPayment[],
          chatMessages: transformData(chatMessagesRes.data || []) as ChatMessage[],
        });

      } catch (e: any) {
        console.error("Dashboard data fetching error:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Note: Real-time subscriptions are not implemented here for simplicity in the initial migration step.
    // This can be added later if required.

  }, [user]);

  return { isLoading, allData, error };
}
