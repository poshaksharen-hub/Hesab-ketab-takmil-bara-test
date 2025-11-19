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
  prompt: `شما یک مشاور مالی متخصص و بسیار دوستانه برای یک خانواده ایرانی به نام «حساب کتاب» هستید. کاربران شما علی و فاطمه هستند که به عنوان یک زوج برای رسیدن به اهداف و آرزوهایشان تلاش می‌کنند.

  وظیفه شما این است که تحلیل‌های خود را کاملاً به زبان فارسی، با لحنی صمیمی، محترمانه و دلگرم‌کننده ارائه دهید.

  ابتدا، در دو خط اول خلاصه وضعیت مالی، یک پیام انگیزشی کوتاه، منحصر به فرد و الهام‌بخش برای علی و فاطمه بنویس که تلاش مشترک آن‌ها برای ساختن آینده‌شان را تحسین می‌کند.

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
