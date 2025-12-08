
'use server';

import type {
  Income,
  Expense,
  BankAccount,
  Check,
  Loan,
  PreviousDebt,
  FinancialGoal,
  AllData,
} from '@/lib/types';
import type {
  EnrichedIncome,
  EnrichedExpense,
  InsightsBankAccount,
  InsightsCheck,
  InsightsLoan,
  InsightsDebt,
  InsightsFinancialGoal,
  FinancialInsightsInput,
} from '@/ai/flows/generate-financial-insights';
import { USER_DETAILS } from '@/lib/constants';

/**
 * Prepares and enriches the raw financial data to be sent to the AI model.
 * It converts IDs to human-readable names.
 */
export async function prepareFinancialInsightsInput(
  allData: AllData,
  currentUserName: string
): Promise<FinancialInsightsInput> {
  const {
    incomes,
    expenses,
    bankAccounts,
    checks,
    loans,
    previousDebts,
    financialGoals,
    categories,
    payees,
  } = allData;

  const getBankAccountName = (id: string) =>
    bankAccounts.find((b) => b.id === id)?.bankName || 'نامشخص';
  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || 'متفرقه';
  const getPayeeName = (id?: string) =>
    id ? payees.find((p) => p.id === id)?.name || 'نامشخص' : 'نامشخص';

  const enrichedIncomes: EnrichedIncome[] = incomes.map((i) => ({
    description: i.description,
    amount: i.amount,
    date: i.date,
    bankAccountName: getBankAccountName(i.bankAccountId),
    source: i.source,
  }));

  const enrichedExpenses: EnrichedExpense[] = expenses.map((e) => ({
    description: e.description,
    amount: e.amount,
    date: e.date,
    bankAccountName: getBankAccountName(e.bankAccountId),
    categoryName: getCategoryName(e.categoryId),
    payeeName: getPayeeName(e.payeeId),
    expenseFor: e.expenseFor ? USER_DETAILS[e.expenseFor]?.firstName || 'مشترک' : 'مشترک',
  }));

  const insightsBankAccounts: InsightsBankAccount[] = bankAccounts.map((b) => ({
    bankName: b.bankName,
    balance: b.balance,
    ownerId: b.ownerId.startsWith('shared') ? 'مشترک' : (USER_DETAILS[b.ownerId as 'ali' | 'fatemeh']?.firstName || 'نامشخص'),
  }));

  const insightsChecks: InsightsCheck[] = checks
    .filter((c) => c.status === 'pending')
    .map((c) => ({
      description: c.description,
      amount: c.amount,
      dueDate: c.dueDate,
      payeeName: getPayeeName(c.payeeId),
      bankAccountName: getBankAccountName(c.bankAccountId),
    }));

  const insightsLoans: InsightsLoan[] = loans
    .filter((l) => l.remainingAmount > 0)
    .map((l) => ({
      title: l.title,
      remainingAmount: l.remainingAmount,
      installmentAmount: l.installmentAmount,
      payeeName: getPayeeName(l.payeeId),
    }));
    
  const insightsDebts: InsightsDebt[] = previousDebts
    .filter(d => d.remainingAmount > 0)
    .map(d => ({
        description: d.description,
        remainingAmount: d.remainingAmount,
        payeeName: getPayeeName(d.payeeId),
    }));

  const insightsFinancialGoals: InsightsFinancialGoal[] = financialGoals.map(
    (g) => ({
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetDate: g.targetDate,
      priority: g.priority,
      isAchieved: g.isAchieved,
    })
  );

  return {
    currentUserName,
    incomes: enrichedIncomes,
    expenses: enrichedExpenses,
    bankAccounts: insightsBankAccounts,
    checks: insightsChecks,
    loans: insightsLoans,
    previousDebts: insightsDebts,
    financialGoals: insightsFinancialGoals,
  };
}
