'use server';
/**
 * @fileOverview A financial insights AI agent.
 *
 * - getFinancialInsights - A function that handles the financial analysis process.
 * - FinancialInsightsInput - The input type for the getFinancialInsights function.
 * - FinancialInsightsOutput - The return type for the getFinancialInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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

const InsightsBankAccountSchema = z.object({
  bankName: z.string(),
  balance: z.number(),
  ownerId: z.string(),
});

const InsightsCheckSchema = z.object({
  description: z.string().optional(),
  amount: z.number(),
  dueDate: z.string(),
  payeeName: z.string(),
  bankAccountName: z.string(),
});

const InsightsLoanSchema = z.object({
  title: z.string(),
  remainingAmount: z.number(),
  installmentAmount: z.number(),
  payeeName: z.string(),
});

const InsightsDebtSchema = z.object({
  description: z.string(),
  remainingAmount: z.number(),
  payeeName: z.string(),
});

const InsightsFinancialGoalSchema = z.object({
  name: z.string(),
  targetAmount: z.number(),
  currentAmount: z.number(),
  targetDate: z.string(),
  priority: z.string(),
  isAchieved: z.boolean(),
});

export const FinancialInsightsInputSchema = z.object({
  currentUserName: z.string(),
  incomes: z.array(EnrichedIncomeSchema),
  expenses: z.array(EnrichedExpenseSchema),
  bankAccounts: z.array(InsightsBankAccountSchema),
  checks: z.array(InsightsCheckSchema),
  loans: z.array(InsightsLoanSchema),
  previousDebts: z.array(InsightsDebtSchema),
  financialGoals: z.array(InsightsFinancialGoalSchema),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({ text: z.string() })),
  })),
});
export type FinancialInsightsInput = z.infer<typeof FinancialInsightsInputSchema>;

export const FinancialInsightsOutputSchema = z.object({
  summary: z.string(),
});
export type FinancialInsightsOutput = z.infer<typeof FinancialInsightsOutputSchema>;

export async function getFinancialInsights(
  input: FinancialInsightsInput
): Promise<FinancialInsightsOutput> {
  return getFinancialInsightsFlow(input);
}

const financialInsightsPrompt = ai.definePrompt({
  name: 'financialInsightsPrompt',
  input: { schema: FinancialInsightsInputSchema },
  output: { schema: FinancialInsightsOutputSchema },
  prompt: `
    You are an expert, highly detailed, and friendly financial advisor for an Iranian family, "Ali and Fatemeh". The user currently talking to you is {{{currentUserName}}}. Your task is to provide your analysis entirely in Persian, with a warm, respectful, and encouraging tone, addressing {{{currentUserName}}} directly.

    Based on the latest user question from the chat history, provide a relevant, helpful, and insightful response. Use the comprehensive financial data below to inform your answer. If the user asks for a general analysis, perform the "Comprehensive Analysis" task. If they ask a specific question, answer it using the data.

    **Comprehensive Financial Data:**
    - **Incomes:** {{{json incomes}}}
    - **Expenses:** {{{json expenses}}}
    - **Bank Accounts:** {{{json bankAccounts}}}
    - **Financial Goals:** {{{json financialGoals}}}
    - **Uncleared Checks:** {{{json checks}}}
    - **Active Loans:** {{{json loans}}}
    - **Other Debts:** {{{json previousDebts}}}

    **Comprehensive Analysis Task (if user asks for it):**
    1.  **Start with an encouraging message:** Begin your analysis with a short, profound, and motivational sentence about the power of will, taking the first step, and achieving great financial goals. Address the user directly by name. (Example: "علی عزیز، بزرگترین قدم‌ها...")
    2.  **Financial Status Summary:**
        - Analyze the family's overall liquidity based on bank balances and income.
        - Identify and analyze the largest sources of income and the highest spending categories. (Example: "A significant portion of expenses is on 'Food and Clothing'.")
        - Point out spending habits (e.g., frequent purchases from a specific payee) and patterns of personal spending (Ali vs. Fatemeh), personalizing your analysis for {{{currentUserName}}}.
        - Analyze financial goals, their progress, and feasibility. Suggest adjustments if necessary.
        - Assess the overall debt situation (checks, loans, miscellaneous debts) relative to assets and income, and provide an overview of the family's financial risk.
    3.  **Actionable Recommendations:**
        - **Debt Repayment Strategy:** Based on monthly income and total debt, suggest a smart strategy for paying off debts. Warn about checks with near due dates and recommend which loan or debt to pay off first.
        - **Budgeting Suggestions:** Based on expense analysis, provide specific suggestions for cost reduction in particular categories. (Example: "It is recommended to reduce the monthly budget for the 'Entertainment' category by 20%.")
        - **Savings & Goals:** Provide encouragement and concrete suggestions on how to reach financial goals faster based on their income and expenses.
        - **General Guidance:** Offer general tips for improving financial health, such as creating an emergency fund, suggesting monthly savings based on income, etc.

    Your analysis must be precise, data-driven, and fully personalized based on the input data. Your entire output should be a single, coherent text.

    **Chat History (for context):**
    {{#each chatHistory}}
      **{{role}}**: {{parts.0.text}}
    {{/each}}
  `,
  config: {
    model: 'gemini-1.5-flash-latest',
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
     safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});

const getFinancialInsightsFlow = ai.defineFlow(
  {
    name: 'getFinancialInsightsFlow',
    inputSchema: FinancialInsightsInputSchema,
    outputSchema: FinancialInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await financialInsightsPrompt(input);
    return output!;
  }
);
