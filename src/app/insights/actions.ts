
'use server';

import { generateFinancialInsights, type FinancialInsightsInput, type FinancialInsightsOutput } from '@/ai/flows/generate-financial-insights';

export async function getFinancialInsightsAction(
  financialData: FinancialInsightsInput | null
): Promise<{ success: boolean; data?: FinancialInsightsOutput; error?: string }> {
  if (!financialData) {
      return { success: false, error: 'اطلاعات مالی برای تحلیل یافت نشد.' };
  }

  // Manually read the API key from server environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
      return { success: false, error: 'کلید API هوش مصنوعی (GEMINI_API_KEY) در سرور تنظیم نشده است.' };
  }


  try {
    // Pass the financial data AND the API key to the flow
    const insights = await generateFinancialInsights(financialData, apiKey);
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
