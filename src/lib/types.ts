

import type { LucideIcon } from 'lucide-react';
import { z } from 'zod';

export type OwnerId = 'ali' | 'fatemeh' | 'shared';

// Defines who an EXPENSE, LIABILITY or GOAL is FOR. This is about the beneficiary.
// This is completely separate from the bank account owner.
export type ExpenseFor = 'ali' | 'fatemeh' | 'shared';

export type BankTheme = 'blue' | 'green' | 'purple' | 'orange' | 'gray' | 'red' | 'teal' | 'cyan' | 'pink' | 'indigo';

export type Income = {
  id: string;
  date: string;
  description:string;
  amount: number;
  type: 'income';
  source: string; // The original source of income text
  ownerId: 'ali' | 'fatemeh' | 'daramad_moshtarak'; // An income can belong to a person or the shared business
  category: string; // This is 'درآمد' for all incomes
  registeredByUserId: string;
  bankAccountId: string;
  createdAt: any;
  updatedAt?: any;
  balanceAfter?: number;
}

export type Expense = {
  id: string;
  ownerId: 'ali' | 'fatemeh' | 'shared_account'; // Owner of the bank account used for payment
  registeredByUserId: string;
  bankAccountId: string;
  categoryId: string;
  payeeId?: string; // Optional payee for direct expenses
  amount: number;
  date: string;
  description: string;
  type: 'expense';
  subType?: 'goal_saved_portion' | 'goal_cash_portion' | 'loan_payment' | 'debt_payment' | 'goal_contribution'; // For differentiating special expenses
  expenseFor: ExpenseFor; // The person/entity this expense was for.
  checkId?: string;
  goalId?: string;
  loanPaymentId?: string;
  debtPaymentId?: string;
  createdAt: any;
  updatedAt?: any;
  balanceBefore?: number;
  balanceAfter?: number;
};


export type BankAccount = {
    id: string;
    ownerId: 'ali' | 'fatemeh' | 'shared_account'; // A bank account can be personal ('ali', 'fatemeh') or the single shared account
    bankName: string;
    accountNumber: string;
    cardNumber: string;
    expiryDate: string; // MM/YY
    cvv2: string;
    accountType: 'checking' | 'savings';
    balance: number;
    initialBalance: number;
    blockedBalance: number;
    theme: BankTheme;
}

export type Category = {
  id: string;
  name: string;
  description?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export type Payee = {
    id: string;
    name: string;
    phoneNumber?: string;
}

export type Check = {
    id: string;
    registeredByUserId: string;
    ownerId: 'ali' | 'fatemeh' | 'shared_account'; // Who owns this liability (person or shared account)
    expenseFor: ExpenseFor; // Who the check is for
    bankAccountId: string;
    payeeId: string;
    categoryId: string;
    amount: number;
    issueDate: string;
    dueDate: string;
    status: 'pending' | 'cleared';
    clearedDate?: string;
    description?: string;
    sayadId: string;
    checkSerialNumber: string;
}

export type FinancialGoalContribution = {
  bankAccountId: string;
  amount: number;
  date: string;
  registeredByUserId: string;
};

export type FinancialGoal = {
    id: string;
    registeredByUserId: string;
    ownerId: OwnerId; // A goal can be for a person or a shared family goal
    name: string;
    targetAmount: number;
    currentAmount: number;
    actualCost?: number; // The real cost when achieved
    targetDate: string;
    isAchieved: boolean;
    priority: 'low' | 'medium' | 'high';
    contributions: FinancialGoalContribution[];
}


export type Loan = {
    id: string;
    registeredByUserId: string;
    ownerId: OwnerId; // Who is responsible for this loan (beneficiary)
    payeeId?: string;
    title: string;
    amount: number;
    installmentAmount: number;
    remainingAmount: number;
    startDate: string;
    firstInstallmentDate: string;
    numberOfInstallments: number;
    paidInstallments: number;
    depositToAccountId?: string;
}

export type LoanPayment = {
    id: string;
    registeredByUserId: string;
    loanId: string;
    bankAccountId: string;
    amount: number;
    paymentDate: string;
}

export type PreviousDebt = {
    id: string;
    registeredByUserId: string;
    ownerId: OwnerId; // Who the debt is for (beneficiary)
    payeeId: string;
    description: string;
    amount: number;
    remainingAmount: number;
    startDate: string;
    isInstallment: boolean;
    dueDate?: string; // For single payment debts
    firstInstallmentDate?: string; // For installment debts
    numberOfInstallments?: number;
    installmentAmount?: number;
    paidInstallments: number;
}

export type DebtPayment = {
    id: string;
    registeredByUserId: string;
    debtId: string;
    bankAccountId: string;
    amount: number;
    paymentDate: string;
}

export type Transfer = {
    id: string;
    registeredByUserId: string;
    fromBankAccountId: string;
    toBankAccountId: string;
    amount: number;
    transferDate: string;
    description?: string;
    fromAccountBalanceBefore: number;
    fromAccountBalanceAfter: number;
    toAccountBalanceBefore: number;
    toAccountBalanceAfter: number;
}

// AI Insights Types
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

const FinancialGoalSchema = z.object({
  name: z.string(),
  targetAmount: z.number(),
  currentAmount: z.number(),
  targetDate: z.string(),
  priority: z.string(),
  isAchieved: z.boolean(),
});

const ChatHistorySchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export const FinancialInsightsInputSchema = z.object({
  currentUserName: z.string(),
  incomes: z.array(EnrichedIncomeSchema),
  expenses: z.array(EnrichedExpenseSchema),
  bankAccounts: z.array(BankAccountSchema),
  checks: z.array(CheckSchema),
  loans: z.array(LoanSchema),
  previousDebts: z.array(DebtSchema),
  financialGoals: z.array(FinancialGoalSchema),
  history: z.array(ChatHistorySchema),
  latestUserQuestion: z.string(),
});
export type FinancialInsightsInput = z.infer<typeof FinancialInsightsInputSchema>;

export const FinancialInsightsOutputSchema = z.object({
  summary: z.string(),
});
export type FinancialInsightsOutput = z.infer<typeof FinancialInsightsOutputSchema>;
