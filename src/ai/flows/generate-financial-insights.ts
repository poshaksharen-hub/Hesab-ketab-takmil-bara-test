
'use server';

/**
 * @fileOverview A flow for generating personalized financial insights and recommendations based on transaction history.
 *
 * - generateFinancialInsights - A function that generates financial insights.
 * - FinancialInsightsInput - The input type for the generateFinancialInsights function.
 * - FinancialInsightsOutput - The return type for the generateFinancialInsights function.
 */

// =================================================================
// GENKIT CONFIGURATION (MOVED HERE TO FIX API KEY ISSUE)
// =================================================================
import { config } from 'dotenv';
config(); // Load environment variables from .env file FIRST.

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    'GEMINI_API_KEY is not defined. Please set it in your .env file.'
  );
}

// Configure the 'ai' object locally within this file. DO NOT EXPORT IT.
const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-2.5-flash',
});
// =================================================================


import {z} from 'genkit';

const EnrichedIncomeSchema = z.object({
    description: z.string(),
    amount: z.number(),
    date: z.string(),
    bankAccountName: z.string(),
    source: z.string().optional(),
});

const EnrichedExpenseSchema = z.object({
    description: z.string(),
    amount: z.number(),
    date: z.string(),
    bankAccountName: z.string(),
    categoryName: z.string(),
    payeeName: z.string().optional(),
    expenseFor: z.string(),
});

const BankAccountSchema = z.object({
    bankName: z.string(),
    balance: z.number(),
    ownerId: z.string(),
});

const CheckSchema = z.object({
    description: z.string().optional(),
    amount: z.number(),
    dueDate: z.string(),
    payeeName: z.string(),
    bankAccountName: z.string(),
});

const LoanSchema = z.object({
    title: z.string(),
    remainingAmount: z.number(),
    installmentAmount: z.number(),
    payeeName: z.string(),
});

const DebtSchema = z.object({
    description: z.string(),
    remainingAmount: z.number(),
    payeeName: z.string(),
});


const FinancialInsightsInputSchema = z.object({
  incomes: z.array(EnrichedIncomeSchema).describe("لیست درآمدهای خانواده، غنی‌شده با نام بانک."),
  expenses: z.array(EnrichedExpenseSchema).describe("لیست هزینه‌های خانواده، غنی‌شده با نام بانک، دسته‌بندی و طرف حساب."),
  bankAccounts: z.array(BankAccountSchema).describe("لیست تمام حساب‌های بانکی و موجودی فعلی آنها."),
  checks: z.array(CheckSchema).describe("لیست تمام چک‌های پاس نشده."),
  loans: z.array(LoanSchema).describe("لیست تمام وام‌های تسویه نشده."),
  previousDebts: z.array(DebtSchema).describe("لیست تمام بدهی‌های متفرقه تسویه نشده."),
});
export type FinancialInsightsInput = z.infer<typeof FinancialInsightsInputSchema>;

const FinancialInsightsOutputSchema = z.object({
  summary: z.string().describe('یک خلاصه تحلیلی و عمیق از وضعیت مالی کلی خانواده.'),
  recommendations: z
    .string()
    .describe('چندین پیشنهاد عملی، اولویت‌بندی شده و هوشمندانه برای مدیریت بدهی‌ها و بهبود سلامت مالی.'),
});
export type FinancialInsightsOutput = z.infer<typeof FinancialInsightsOutputSchema>;

export async function generateFinancialInsights(input: FinancialInsightsInput): Promise<FinancialInsightsOutput> {
  return generateFinancialInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialInsightsPrompt',
  input: {schema: FinancialInsightsInputSchema},
  output: {schema: FinancialInsightsOutputSchema},
  prompt: `شما یک مشاور مالی متخصص، بسیار دقیق و دوستانه برای خانواده ایرانی «علی و فاطمه» هستید. وظیفه شما این است که تحلیل‌های خود را کاملاً به زبان فارسی، با لحنی صمیمی، محترمانه و دلگرم‌کننده ارائه دهید.

  داده‌های زیر تصویر کامل مالی این خانواده است:
  - **درآمدها:** {{{json incomes}}}
  - **هزینه‌ها:** {{{json expenses}}}
  - **حساب‌های بانکی:** {{{json bankAccounts}}}
  - **چک‌های پاس نشده:** {{{json checks}}}
  - **وام‌های فعال:** {{{json loans}}}
  - **سایر بدهی‌ها:** {{{json previousDebts}}}

  **وظایف شما:**

  ۱.  **شروع با یک پیام انگیزشی:** تحلیل خود را با یک جمله انگیزشی کوتاه، عمیق و «سنگین» در مورد قدرت اراده، برداشتن قدم اول، و رسیدن به اهداف مالی بزرگ شروع کن. از نام بردن افراد خودداری کن و یک پیام فلسفی و الهام‌بخش ارائه بده.

  ۲.  **خلاصه وضعیت مالی (برای فیلد summary):**
      - وضعیت کلی نقدینگی خانواده را بر اساس موجودی حساب‌ها و درآمدها تحلیل کن.
      - بزرگترین منابع درآمد و بیشترین دسته‌بندی‌های هزینه را شناسایی و تحلیل کن. (مثال: "بخش قابل توجهی از هزینه‌ها صرف دسته 'خوراک و پوشاک' شده است.")
      - به عادت‌های خرید (مثلاً خریدهای زیاد از یک طرف حساب خاص) و الگوی هزینه‌های شخصی (علی در مقابل فاطمه) اشاره کن.
      - وضعیت کلی بدهی‌ها (چک، وام، بدهی متفرقه) را نسبت به دارایی‌ها و درآمدها بسنج و یک دید کلی از ریسک مالی خانواده ارائه بده.

  ۳.  **پیشنهادهای عملی (برای فیلد recommendations):**
      - **اولویت‌بندی پرداخت بدهی‌ها:** با توجه به درآمد ماهانه و کل بدهی‌ها، یک استراتژی هوشمندانه برای پرداخت بدهی‌ها پیشنهاد بده. به چک‌های نزدیک به تاریخ سررسید هشدار بده و پیشنهاد کن کدام وام یا بدهی را زودتر تسویه کنند.
      - **پیشنهادهای بودجه‌بندی:** بر اساس تحلیل هزینه‌ها، پیشنهادهای مشخص برای کاهش هزینه‌ها در دسته‌بندی‌های خاص ارائه بده. (مثال: "پیشنهاد می‌شود بودجه ماهانه برای دسته 'تفریح و سرگرمی' را ۲۰٪ کاهش دهید.")
      - **راهنمایی‌های عمومی:** نکات کلی برای بهبود سلامت مالی مانند ایجاد صندوق اضطراری، پیشنهاد پس‌انداز ماهانه بر اساس درآمد و غیره ارائه بده.

  تحلیل شما باید دقیق، داده‌محور و کاملاً شخصی‌سازی شده بر اساس اطلاعات ورودی باشد.`,
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
