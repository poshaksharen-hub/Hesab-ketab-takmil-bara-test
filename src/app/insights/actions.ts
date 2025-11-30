
'use server';

import { generateFinancialInsights, type FinancialInsightsInput, type FinancialInsightsOutput } from '@/ai/flows/generate-financial-insights';

export async function getFinancialInsightsAction(
  financialData: FinancialInsightsInput | null
): Promise<{ success: boolean; data?: FinancialInsightsOutput; error?: string }> {
  if (!financialData) {
      return { success: false, error: 'اطلاعات مالی برای تحلیل یافت نشد.' };
  }

  try {
    const insights = await generateFinancialInsights(financialData);
    return { success: true, data: insights };
  } catch (e: any) {
    console.error('Error in getFinancialInsightsAction:', e);
    // Check for specific error messages related to API keys to provide better feedback
    if (e.message?.includes('API key')) {
        return { success: false, error: `خطا در ارتباط با سرویس هوش مصنوعی: ${e.message}` };
    }
    return { success: false, error: e.message || 'یک خطای ناشناخته در سرور رخ داد.' };
  }
}
