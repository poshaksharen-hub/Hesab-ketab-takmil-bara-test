
'use server';

import type { AllData } from '@/lib/types';
import type {
  FinancialInsightsInput,
} from '@/ai/flows/generate-financial-insights';
import { USER_DETAILS } from '@/lib/constants';

/**
 * Prepares and enriches the raw financial data to be sent to the AI model.
 * It converts IDs to human-readable names and handles potentially missing or corrupt data.
 */
export async function prepareFinancialInsightsInput(
  allData: AllData,
  currentUserName: string
): Promise<Omit<FinancialInsightsInput, 'history' | 'latestUserQuestion'>> {
  // Default to empty arrays to prevent errors on undefined properties
  const {
    incomes = [],
    expenses = [],
    bankAccounts = [],
    checks = [],
    loans = [],
    previousDebts = [],
    financialGoals = [],
    categories = [],
    payees = [],
  } = allData || {};

  const getBankAccountName = (id: string) =>
    bankAccounts.find((b) => b.id === id)?.bankName || 'نامشخص';
  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || 'متفرقه';
  const getPayeeName = (id?: string) =>
    id ? payees.find((p) => p.id === id)?.name || 'نامشخص' : 'نامشخص';

  // By adding .filter(Boolean), we remove any null/undefined items from the arrays before mapping
  const enrichedIncomes = incomes.filter(Boolean).map((i) => ({
    description: i.description,
    amount: i.amount,
    date: i.date,
    bankAccountName: getBankAccountName(i.bankAccountId),
    source: i.source,
  }));

  const enrichedExpenses = expenses.filter(Boolean).map((e) => ({
    description: e.description,
    amount: e.amount,
    date: e.date,
    bankAccountName: getBankAccountName(e.bankAccountId),
    categoryName: getCategoryName(e.categoryId),
    payeeName: getPayeeName(e.payeeId),
    expenseFor: e.expenseFor ? USER_DETAILS[e.expenseFor]?.firstName || 'مشترک' : 'مشترک',
  }));

  const insightsBankAccounts = bankAccounts.filter(Boolean).map((b) => ({
    bankName: b.bankName,
    balance: b.balance,
    ownerId: b.ownerId.startsWith('shared') ? 'مشترک' : (USER_DETAILS[b.ownerId as 'ali' | 'fatemeh']?.firstName || 'نامشخص'),
  }));

  const insightsChecks = checks
    .filter(c => c && c.status === 'pending') // Combined filter
    .map((c) => ({
      description: c.description,
      amount: c.amount,
      dueDate: c.dueDate,
      payeeName: getPayeeName(c.payeeId),
      bankAccountName: getBankAccountName(c.bankAccountId),
    }));

  const insightsLoans = loans
    .filter(l => l && l.remainingAmount > 0) // Combined filter
    .map((l) => ({
      title: l.title,
      remainingAmount: l.remainingAmount,
      installmentAmount: l.installmentAmount,
      payeeName: getPayeeName(l.payeeId),
    }));
    
  const insightsDebts = previousDebts
    .filter(d => d && d.remainingAmount > 0) // Combined filter
    .map(d => ({
        description: d.description,
        remainingAmount: d.remainingAmount,
        payeeName: getPayeeName(d.payeeId),
    }));

  const insightsFinancialGoals = financialGoals.filter(Boolean).map(
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
