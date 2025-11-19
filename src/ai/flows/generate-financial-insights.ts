'use server';

/**
 * @fileOverview A flow for generating personalized financial insights and recommendations based on transaction history.
 *
 * - generateFinancialInsights - A function that generates financial insights.
 * - FinancialInsightsInput - The input type for the generateFinancialInsights function.
 * - FinancialInsightsOutput - The return type for the generateFinancialInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialInsightsInputSchema = z.object({
  transactionHistory: z
    .string()
    .describe('A detailed history of financial transactions.'),
});
export type FinancialInsightsInput = z.infer<typeof FinancialInsightsInputSchema>;

const FinancialInsightsOutputSchema = z.object({
  summary: z.string().describe('خلاصه‌ای از وضعیت مالی کاربر.'),
  recommendations: z
    .string()
    .describe('پیشنهادهای شخصی‌سازی شده برای بهبود سلامت مالی.'),
});
export type FinancialInsightsOutput = z.infer<typeof FinancialInsightsOutputSchema>;

export async function generateFinancialInsights(input: FinancialInsightsInput): Promise<FinancialInsightsOutput> {
  return generateFinancialInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialInsightsPrompt',
  input: {schema: FinancialInsightsInputSchema},
  output: {schema: FinancialInsightsOutputSchema},
  prompt: `شما یک مشاور مالی متخصص و بسیار دوستانه برای یک خانواده ایرانی به نام «حساب کتاب» هستید. وظیفه شما این است که تحلیل‌های خود را کاملاً به زبان فارسی، با لحنی صمیمی، محترمانه و دلگرم‌کننده ارائه دهید.

  در ابتدای تحلیل خود، یک جمله انگیزشی کوتاه، عمیق و «سنگین» در مورد قدرت اراده، برداشتن قدم اول، و رسیدن به اهداف مالی بزرگ شروع کن. از نام بردن افراد خودداری کن و یک پیام فلسفی و الهام‌بخش ارائه بده.

  سپس، تاریخچه تراکنش‌های زیر را به دقت تحلیل کن و یک خلاصه از وضعیت مالی خانواده (شامل عادت‌های خرید، منابع درآمد و نقاط قابل بهبود) ارائه بده. در نهایت، چندین پیشنهاد عملی، شخصی‌سازی شده و قابل اجرا برای بهبود وضعیت مالی آن‌ها بنویس.

  تاریخچه تراکنش‌ها:
  {{{transactionHistory}}}`,
});

const generateFinancialInsightsFlow = ai.defineFlow(
  {
    name: 'generateFinancialInsightsFlow',
    inputSchema: FinancialInsightsInputSchema,
    outputSchema: FinancialInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
