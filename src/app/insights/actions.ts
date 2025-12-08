
'use server';

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Content } from "@google/generative-ai";

// Define input/output interfaces directly, without Zod on the client side
export interface EnrichedIncome {
  description: string;
  amount: number;
  date: string;
  bankAccountName: string;
  source?: string;
}

export interface EnrichedExpense {
  description: string;
  amount: number;
  date: string;
  bankAccountName: string;
  categoryName: string;
  payeeName?: string;
  expenseFor: string;
}

export interface InsightsBankAccount {
  bankName: string;
  balance: number;
  ownerId: string;
}

export interface InsightsCheck {
  description?: string;
  amount: number;
  dueDate: string;
  payeeName: string;
  bankAccountName: string;
}

export interface InsightsLoan {
  title: string;
  remainingAmount: number;
  installmentAmount: number;
  payeeName: string;
}

export interface InsightsDebt {
  description: string;
  remainingAmount: number;
  payeeName: string;
}

export interface InsightsFinancialGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: string;
  isAchieved: boolean;
}

export interface ChatHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface FinancialInsightsInput {
  currentUserName: string;
  incomes: EnrichedIncome[];
  expenses: EnrichedExpense[];
  bankAccounts: InsightsBankAccount[];
  checks: InsightsCheck[];
  loans: InsightsLoan[];
  previousDebts: InsightsDebt[];
  financialGoals: InsightsFinancialGoal[];
}

export interface FinancialInsightsOutput {
  summary: string;
}
// End of interfaces

const MODEL_NAME = "gemini-1.5-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY || '';

const generationConfig: GenerationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];


function buildSystemInstruction(input: FinancialInsightsInput): Content {
    const dataPrompt = `
    You are an expert, highly detailed, and friendly financial advisor for an Iranian family, "Ali and Fatemeh". The user currently talking to you is ${input.currentUserName}. Your task is to provide your analysis entirely in Persian, with a warm, respectful, and encouraging tone, addressing ${input.currentUserName} directly.

    Based on the latest user question and the entire conversation history, provide a relevant, helpful, and insightful response. Use the comprehensive financial data below to inform your answer. If the user asks for a general analysis, perform the "Comprehensive Analysis" task. If they ask a specific question, answer it using the data.

    **Comprehensive Financial Data:**
    - **Incomes:** ${JSON.stringify(input.incomes)}
    - **Expenses:** ${JSON.stringify(input.expenses)}
    - **Bank Accounts:** ${JSON.stringify(input.bankAccounts)}
    - **Financial Goals:** ${JSON.stringify(input.financialGoals)}
    - **Uncleared Checks:** ${JSON.stringify(input.checks)}
    - **Active Loans:** ${JSON.stringify(input.loans)}
    - **Other Debts:** ${JSON.stringify(input.previousDebts)}

    **Comprehensive Analysis Task (if user asks for it):**
    1.  **Start with an encouraging message:** Begin your analysis with a short, profound, and motivational sentence about the power of will, taking the first step, and achieving great financial goals. Address the user directly by name. (Example: "علی عزیز، بزرگترین قدم‌ها...")
    2.  **Financial Status Summary:**
        - Analyze the family's overall liquidity based on bank balances and income.
        - Identify and analyze the largest sources of income and the highest spending categories. (Example: "A significant portion of expenses is on 'Food and Clothing'.")
        - Point out spending habits (e.g., frequent purchases from a specific payee) and patterns of personal spending (Ali vs. Fatemeh), personalizing your analysis for ${input.currentUserName}.
        - Analyze financial goals, their progress, and feasibility. Suggest adjustments if necessary.
        - Assess the overall debt situation (checks, loans, miscellaneous debts) relative to assets and income, and provide an overview of the family's financial risk.
    3.  **Actionable Recommendations:**
        - **Debt Repayment Strategy:** Based on monthly income and total debt, suggest a smart strategy for paying off debts. Warn about checks with near due dates and recommend which loan or debt to pay off first.
        - **Budgeting Suggestions:** Based on expense analysis, provide specific suggestions for cost reduction in particular categories. (Example: "It is recommended to reduce the monthly budget for the 'Entertainment' category by 20%.")
        - **Savings & Goals:** Provide encouragement and concrete suggestions on how to reach financial goals faster based on their income and expenses.
        - **General Guidance:** Offer general tips for improving financial health, such as creating an emergency fund, suggesting monthly savings based on income, etc.

    Your analysis must be precise, data-driven, and fully personalized based on the input data. Your entire output should be a single, coherent text.
    `;
    return { role: "system", parts: [{ text: dataPrompt }] };
}


export async function getFinancialInsightsAction(
  financialData: FinancialInsightsInput | null,
  history: ChatHistory[]
): Promise<{ success: boolean; data?: FinancialInsightsOutput; error?: string }> {
  if (!API_KEY) {
      return { success: false, error: 'کلید API هوش مصنوعی (GEMINI_API_KEY) تنظیم نشده است.' };
  }
  if (!financialData) {
      return { success: false, error: 'اطلاعات مالی برای تحلیل یافت نشد.' };
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig,
        safetySettings,
        systemInstruction: buildSystemInstruction(financialData),
    });

    const chat = model.startChat({
        history: history.map(h => ({
            role: h.role,
            parts: h.parts.map(p => ({ text: p.text })),
        })),
    });

    const latestUserMessage = history.slice().reverse().find(m => m.role === 'user');
    const userPrompt = latestUserMessage?.parts[0]?.text || 'یک تحلیل کلی به من بده.';
    
    const result = await chat.sendMessage(userPrompt);
    const response = result.response;
    const text = response.text();

    return { success: true, data: { summary: text } };

  } catch (e: any) {
    console.error('Error in getFinancialInsightsAction:', e);
    // Provide more specific error messages if possible
    if (e.message.includes('404')) {
         return { success: false, error: `خطا در ارتباط با سرویس هوش مصنوعی: مدل '${MODEL_NAME}' یافت نشد. لطفا از فعال بودن مدل در پروژه خود اطمینان حاصل کنید.` };
    }
    const errorMessage = e.message || 'یک خطای ناشناخته در سرور رخ داد.';
    return { success: false, error: `خطا در ارتباط با سرویس هوش مصنوعی: ${errorMessage}` };
  }
}
