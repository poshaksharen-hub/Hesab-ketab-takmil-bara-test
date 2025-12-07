'use server';

/**
 * @fileOverview A flow for generating personalized financial insights and recommendations based on transaction history.
 *
 * - generateFinancialInsights - A function that generates financial insights.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';
import type { FinancialInsightsInput, FinancialInsightsOutput } from '@/lib/types';
import { FinancialInsightsInputSchema, FinancialInsightsOutputSchema } from '@/lib/types';


// This flow is designed to be called directly from a Next.js Server Action.
// We must ensure that environment variables are loaded correctly, especially GEMINI_API_KEY.
// The configuration is handled here to be self-contained.

// Initialize Genkit with the Google AI plugin
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  defaultModel: 'gemini-pro'
});


const prompt = ai.definePrompt({
    name: 'financialInsightsPrompt',
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
        - **Budgeting Suggestions:** Based on expense analysis, provide specific suggestions for cost reduction in particular categories. (Example: "It is recommended to reduce the monthly budget for the 'Entertainment' category by 20%.")
        - **Savings & Goals:** Provide encouragement and concrete suggestions on how to reach financial goals faster based on their income and expenses.
        - **General Guidance:** Offer general tips for improving financial health, such as creating an emergency fund, suggesting monthly savings based on income, etc.

    Your analysis must be precise, data-driven, and fully personalized based on the input data. Your entire output should be a single, coherent text placed in the 'summary' field.`
});

// Define the flow, which will be called by the main function
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


// This is the main server action function that will be called by the client
export async function generateFinancialInsights(input: FinancialInsightsInput): Promise<FinancialInsightsOutput> {
    return generateFinancialInsightsFlow(input);
}
