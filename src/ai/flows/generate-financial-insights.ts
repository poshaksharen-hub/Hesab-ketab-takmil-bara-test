
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
    model: 'gemini-pro', // Changed to a stable, available model
    input: { schema: FinancialInsightsInputSchema },
    output: { schema: FinancialInsightsOutputSchema },
    prompt: `You are an expert, highly detailed, and friendly financial advisor and data integrity auditor for an Iranian family, "Ali and Fatemeh". The user currently talking to you is {{{currentUserName}}}. Your task is to provide your analysis entirely in Persian, with a warm, respectful, and encouraging tone, addressing {{{currentUserName}}} directly.

    **Conversation History So Far:**
    {{#if history}}
    {{#each history}}
    - **{{role}}**: {{content}}
    {{/each}}
    {{/if}}

    **Latest User Question:**
    "{{{latestUserQuestion}}}"

    Based on the latest user question and the entire conversation history, provide a relevant, helpful, and insightful response. Use the comprehensive financial data below to inform your answer.

    **Comprehensive Financial Data:**
    - **Incomes:** {{{json incomes}}}
    - **Expenses:** {{{json expenses}}}
    - **Bank Accounts:** {{{json bankAccounts}}}
    - **Financial Goals:** {{{json financialGoals}}}
    - **Uncleared Checks:** {{{json checks}}}
    - **Active Loans:** {{{json loans}}}
    - **Other Debts:** {{{json previousDebts}}}

    **Your Tasks:**

    1.  **General Financial Analysis (if the user asks for it):**
        - **Start with an encouraging message:** Begin with a short, profound, and motivational sentence.
        - **Financial Status Summary:** Analyze liquidity, main income sources, and top spending categories.
        - **Spending Habits:** Point out spending habits (e.g., frequent purchases from a specific payee) and patterns of personal spending (Ali vs. Fatemeh).
        - **Goals & Debts:** Assess goal progress and the overall debt situation (checks, loans, etc.) relative to assets.
        - **Actionable Recommendations:** Provide a smart debt repayment strategy, budgeting suggestions, and savings tips.

    2.  **Data Integrity Audit (if the user asks to check or verify a transaction):**
        - **Identify the Transaction:** Based on the user's description (e.g., "that expense for bread"), find the relevant transaction in the provided JSON data.
        - **Trace the Transaction:** Perform a step-by-step audit. For an expense, verify:
            - **Bank Account:** Does the expense amount correctly reflect a change in the corresponding bank account's balance? (Note: You can't see the before/after balance directly, so state that you are checking the logic).
            - **Payee:** Is the expense correctly listed under the transaction history for the specified payee? (Conceptually, as you don't have payee-specific transaction lists).
            - **Category:** Is the expense correctly associated with its category?
            - **User & Beneficiary:** Confirm the person who registered it and who it was for.
        - **Report Findings:** Clearly state your findings. Example: "Yes, I've checked. The 15,000 Toman expense for 'Supermarket' on [Date] was correctly registered by Ali from the Bank Melli card. This should be reflected in the 'Groceries' category and the 'Supermarket' payee history." If you find a logical inconsistency, report that.

    Your analysis must be precise, data-driven, and fully personalized. Format your response using Markdown for better readability (e.g., using **bold** for titles, and lists for recommendations). Your entire output should be a single, coherent text placed in the 'summary' field.`
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
