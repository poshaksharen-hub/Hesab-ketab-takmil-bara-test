
'use server';

import { generateFinancialInsights, type FinancialInsightsInput, type FinancialInsightsOutput } from '@/ai/flows/generate-financial-insights';

export async function getFinancialInsightsAction(
  financialData: Omit<FinancialInsightsInput, 'latestUserQuestion'> | null
): Promise<{ success: boolean; data?: FinancialInsightsOutput; error?: string }> {
  if (!financialData) {
      return { success: false, error: 'اطلاعات مالی برای تحلیل یافت نشد.' };
  }

  try {
    const insights = await generateFinancialInsights(financialData);
    return { success: true, data: insights };
  } catch (e: any) {
    console.error('Error in getFinancialInsightsAction:', e);
    // Extract the core error message if available, otherwise show the full error.
    const errorMessage = e.cause?.message || e.message || 'یک خطای ناشناخته در سرور رخ داد.';
    return { success: false, error: `خطا در ارتباط با سرویس هوش مصنوعی: ${errorMessage}` };
  }
}
