
'use server';

import { generateFinancialInsights as generateFinancialInsightsFlow } from '@/ai/flows/generate-financial-insights';
import type { FinancialInsightsInput, FinancialInsightsOutput } from '@/ai/flows/generate-financial-insights';


export async function getFinancialInsightsAction(
  financialData: Omit<FinancialInsightsInput, 'latestUserQuestion'> | null
): Promise<{ success: boolean; data?: FinancialInsightsOutput; error?: string }> {
  if (!financialData) {
      return { success: false, error: 'اطلاعات مالی برای تحلیل یافت نشد.' };
  }

  try {
    // The entire logic is now a pure server action, so we can directly call the flow.
    // The previous implementation was incorrectly mixing client and server firebase initializations.
    
    // Find the last message from the 'user' to pass as the specific question
    const latestUserMessage = financialData.history.slice().reverse().find(m => m.role === 'user');
    const fullInput: FinancialInsightsInput = {
      ...financialData,
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
