

import type { LucideIcon } from 'lucide-react';

export type OwnerId = 'ali' | 'fatemeh' | 'shared';

export type Income = {
  id: string;
  date: string;
  description:string;
  amount: number;
  type: 'income';
  source: string; // The original source of income text
  ownerId: OwnerId; // 'ali', 'fatemeh', or 'shared'
  category: string; // This is 'درآمد' for all incomes
  registeredByUserId: string;
  bankAccountId: string;
  createdAt: any;
  updatedAt?: any;
  balanceAfter?: number;
}

export type Expense = {
  id: string;
  ownerId: OwnerId; // Owner of the bank account used
  registeredByUserId: string;
  bankAccountId: string;
  categoryId: string;
  payeeId?: string; // Optional payee for direct expenses
  amount: number;
  date: string;
  description: string;
  type: 'expense';
  subType?: 'goal_saved_portion' | 'goal_cash_portion' | 'debt_payment'; // For differentiating special expenses
  expenseFor?: 'ali' | 'fatemeh' | 'shared'; // The person/entity this expense was for.
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
    ownerId: OwnerId;
    bankName: string;
    accountNumber: string;
    cardNumber: string;
    expiryDate: string; // MM/YY
    cvv2: string;
    accountType: 'checking' | 'savings';
    balance: number;
    initialBalance: number;
    blockedBalance?: number;
    theme: 'blue' | 'green' | 'purple' | 'orange' | 'gray';
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
    ownerId: OwnerId;
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
};

export type FinancialGoal = {
    id: string;
    registeredByUserId: string;
    ownerId: OwnerId; // Who this goal is for
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
    ownerId: OwnerId;
    payeeId?: string;
    title: string;
    amount: number;
    installmentAmount: number;
    remainingAmount: number;
    startDate: string;
    paymentDay: number; // Day of the month
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
    ownerId: OwnerId;
    payeeId: string;
    description: string;
    amount: number;
    remainingAmount: number;
    startDate: string;
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
