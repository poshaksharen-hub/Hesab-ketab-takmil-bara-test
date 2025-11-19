'use server';

import { generateFinancialInsights, type FinancialInsightsOutput } from '@/ai/flows/generate-financial-insights';

export async function getFinancialInsightsAction(
  transactionHistory: string
): Promise<{ success: boolean; data?: FinancialInsightsOutput; error?: string }> {
  try {
    const insights = await generateFinancialInsights({ transactionHistory });
    return { success: true, data: insights };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message || 'An unknown error occurred.' };
  }
}
