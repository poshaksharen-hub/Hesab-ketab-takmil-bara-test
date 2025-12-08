
'use server';

/**
 * @fileOverview A flow for generating personalized financial insights and recommendations based on transaction history.
 *
 * - generateFinancialInsights - A function that generates financial insights.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod schemas here, locally, to avoid client-side bundling issues.
const EnrichedIncomeSchema = z.object({
  description: z.string(),
  amount: z.number(),
  date: z.string(),
  bankAccountName: z.string(),
  source: z.string().optional(),
});
export type EnrichedIncome = z.infer<typeof EnrichedIncomeSchema>;


const EnrichedExpenseSchema = z.object({
  description: z.string(),
  amount: z.number(),
  date: z.string(),
  bankAccountName: z.string(),
  categoryName: z.string(),
  payeeName: z.string().optional(),
  expenseFor: z.string(),
});
export type EnrichedExpense = z.infer<typeof EnrichedExpenseSchema>;


const BankAccountSchema = z.object({
  bankName: z.string(),
  balance: z.number(),
  ownerId: z.string(),
});
export type InsightsBankAccount = z.infer<typeof BankAccountSchema>;


const CheckSchema = z.object({
  description: z.string().optional(),
  amount: z.number(),
  dueDate: z.string(),
  payeeName: z.string(),
  bankAccountName: z.string(),
});
export type InsightsCheck = z.infer<typeof CheckSchema>;


const LoanSchema = z.object({
  title: z.string(),
  remainingAmount: z.number(),
  installmentAmount: z.number(),
  payeeName: z.string(),
});
export type InsightsLoan = z.infer<typeof LoanSchema>;


const DebtSchema = z.object({
  description: z.string(),
  remainingAmount: z.number(),
  payeeName: z.string(),
});
export type InsightsDebt = z.infer<typeof DebtSchema>;


const FinancialGoalSchema = z.object({
  name: z.string(),
  targetAmount: z.number(),
  currentAmount: z.number(),
  targetDate: z.string(),
  priority: z.string(),
  isAchieved: z.boolean(),
});
export type InsightsFinancialGoal = z.infer<typeof FinancialGoalSchema>;


const ChatHistorySchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatHistory = z.infer<typeof ChatHistorySchema>;

const FinancialInsightsInputSchema = z.object({
  currentUserName: z.string(),
  incomes: z.array(EnrichedIncomeSchema),
  expenses: z.array(EnrichedExpenseSchema),
  bankAccounts: z.array(BankAccountSchema),
  checks: z.array(CheckSchema),
  loans: z.array(LoanSchema),
  previousDebts: z.array(DebtSchema),
  financialGoals: z.array(FinancialGoalSchema),
  history: z.array(ChatHistorySchema).optional(),
  latestUserQuestion: z.string().optional(),
});
export type FinancialInsightsInput = z.infer<typeof FinancialInsightsInputSchema>;


const FinancialInsightsOutputSchema = z.object({
  summary: z.string().describe("The comprehensive financial analysis and recommendations in Persian."),
});
export type FinancialInsightsOutput = z.infer<typeof FinancialInsightsOutputSchema>;


const prompt = ai.definePrompt({
    name: 'financialInsightsPrompt',
    model: 'gemini-1.5-flash-latest',
    input: { schema: FinancialInsightsInputSchema },
    output: { schema: FinancialInsightsOutputSchema },
    prompt: `You are an expert, highly detailed, and friendly financial advisor for an Iranian family, "Ali and Fatemeh". The user currently talking to you is {{{currentUserName}}}. Your task is to provide your analysis entirely in Persian, with a warm, respectful, and encouraging tone, addressing {{{currentUserName}}} directly.

    **Conversation History So Far:**
    {{#if history}}
    {{#each history}}
    - **{{role}}**: {{content}}
    {{/each}}
    {{/if}}

    **Latest User Question:**
    "{{{latestUserQuestion}}}"

    Based on the latest user question and the entire conversation history, provide a relevant, helpful, and insightful response. Use the comprehensive financial data below to inform your answer. If the user asks for a general analysis, perform the "Comprehensive Analysis" task. If they ask a specific question, answer it using the data.

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
        - **Budgeting Suggestions:** Based on expense analysis, provide specific suggestions for cost-reduction in particular categories. (Example: "It is recommended to reduce the monthly budget for the 'Entertainment' category by 20%.")
        - **Savings & Goals:** Provide encouragement and concrete suggestions on how to reach financial goals faster based on their income and expenses.
        - **General Guidance:** Offer general tips for improving financial health, such as creating an emergency fund, suggesting monthly savings based on income, etc.

    Your analysis must be precise, data-driven, and fully personalized based on the input data. Format your response using Markdown for better readability (e.g., using **bold** for titles, and lists for recommendations). Your entire output should be a single, coherent text placed in the 'summary' field.`
});

const generateFinancialInsightsFlow = ai.defineFlow(
    {
      name: 'generateFinancialInsightsFlow',
      inputSchema: FinancialInsightsInputSchema,
      outputSchema: FinancialInsightsOutputSchema,
    },
    async (input) => {
      const { output } = await prompt(input);
      return output!;
    }
);

export async function generateFinancialInsights(input: FinancialInsightsInput): Promise<FinancialInsightsOutput> {
    return generateFinancialInsightsFlow(input);
}
