
'use server';

import { generateFinancialInsights as generateFinancialInsightsFlow } from '@/ai/flows/generate-financial-insights';

// AI Insights Types - Moved here to prevent client-side bundling issues
export interface EnrichedIncome {
  description: string;
  amount: number;
  date: string;
  bankAccountName: string;
  source?: string;
}

export interface EnrichedExpense {
  description: string;
  amount: number;
  date: string;
  bankAccountName: string;
  categoryName: string;
  payeeName?: string;
  expenseFor: string;
}

export interface InsightsBankAccount {
  bankName: string;
  balance: number;
  ownerId: string;
}

export interface InsightsCheck {
  description?: string;
  amount: number;
  dueDate: string;
  payeeName: string;
  bankAccountName: string;
}

export interface InsightsLoan {
  title: string;
  remainingAmount: number;
  installmentAmount: number;
  payeeName: string;
}

export interface InsightsDebt {
  description: string;
  remainingAmount: number;
  payeeName: string;
}

export interface InsightsFinancialGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: string;
  isAchieved: boolean;
}

export interface ChatHistory {
  role: 'user' | 'model';
  content: string;
}

export interface FinancialInsightsInput {
  currentUserName: string;
  incomes: EnrichedIncome[];
  expenses: EnrichedExpense[];
  bankAccounts: InsightsBankAccount[];
  checks: InsightsCheck[];
  loans: InsightsLoan[];
  previousDebts: InsightsDebt[];
  financialGoals: InsightsFinancialGoal[];
  history: ChatHistory[];
  latestUserQuestion: string;
}

export interface FinancialInsightsOutput {
  summary: string;
}
// End of AI Insights Types


export async function getFinancialInsightsAction(
  financialData: Omit<FinancialInsightsInput, 'history' | 'latestUserQuestion'> | null,
  history: FinancialInsightsInput['history']
): Promise<{ success: boolean; data?: FinancialInsightsOutput; error?: string }> {
  if (!financialData) {
      return { success: false, error: 'اطلاعات مالی برای تحلیل یافت نشد.' };
  }

  try {
    const latestUserMessage = history.slice().reverse().find(m => m.role === 'user');
    const fullInput: FinancialInsightsInput = {
      ...financialData,
      history: history,
      latestUserQuestion: latestUserMessage?.content || 'یک تحلیل کلی به من بده.', // Provide a default if no user message is found
    };

    const insights = await generateFinancialInsightsFlow(fullInput);

    return { success: true, data: insights };

  } catch (e: any) {
    console.error('Error in getFinancialInsightsAction:', e);
    const errorMessage = e.message || 'یک خطای ناشناخته در سرور رخ داد.';
    return { success: false, error: `خطا در ارتباط با سرویس هوش مصنوعی: ${errorMessage}` };
  }
}
