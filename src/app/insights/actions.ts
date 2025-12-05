
'use server';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeFirebase } from '@/firebase/client-provider';
import type { FinancialInsightsInput, FinancialInsightsOutput } from '@/ai/flows/generate-financial-insights';


export async function getFinancialInsightsAction(
  financialData: Omit<FinancialInsightsInput, 'latestUserQuestion'> | null
): Promise<{ success: boolean; data?: FinancialInsightsOutput; error?: string }> {
  if (!financialData) {
      return { success: false, error: 'اطلاعات مالی برای تحلیل یافت نشد.' };
  }

  try {
    // We can't use the regular firebase/client-provider here because this is a server action
    // and we need a fresh instance of the functions client.
    const { functions } = initializeFirebase();
    const generateFinancialInsights = httpsCallable<Omit<FinancialInsightsInput, 'latestUserQuestion'>, FinancialInsightsOutput>(functions, 'generateFinancialInsights');
    
    const result = await generateFinancialInsights(financialData);
    const insights = result.data;

    return { success: true, data: insights };

  } catch (e: any) {
    console.error('Error in getFinancialInsightsAction:', e);
    // Extract the core error message if available, otherwise show the full error.
    const errorMessage = e.details?.message || e.message || 'یک خطای ناشناخته در سرور رخ داد.';
    return { success: false, error: `خطا در ارتباط با سرویس هوش مصنوعی: ${errorMessage}` };
  }
}
