import type { LucideIcon } from 'lucide-react';

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  userId: string;
  bankAccountId: string;
};

export type Income = {
  id: string;
  date: string;
  description:string;
  amount: number;
  type: 'income';
  source: string;
  category: string; // This is 'درآمد' for all incomes
  userId: string;
  registeredByUserId: string;
  bankAccountId: string;
  createdAt: any;
  updatedAt?: any;
}

export type Expense = {
  id: string;
  userId: string;
  registeredByUserId: string;
  bankAccountId: string;
  categoryId: string;
  amount: number;
  date: string;
  description: string;
  type: 'expense';
  checkId?: string; // Optional: to link expense to a cleared check
  goalId?: string; // Optional: to link expense to an achieved goal
  loanPaymentId?: string; // Optional: to link expense to a loan payment
  createdAt: any;
  updatedAt?: any;
};


export type BankAccount = {
    id: string;
    userId: string;
    name: string;
    balance: number;
    initialBalance: number;
    blockedBalance?: number;
    isShared?: boolean;
    members?: { [key: string]: boolean };
}

export type Category = {
  id: string;
  userId: string;
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
    userId: string;
    name: string;
    phoneNumber?: string;
}

export type Check = {
    id: string;
    userId: string;
    bankAccountId: string;
    payeeId: string;
    categoryId: string;
    amount: number;
    issueDate: string;
    dueDate: string;
    status: 'pending' | 'cleared';
    description?: string;
}

export type FinancialGoal = {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    isAchieved: boolean;
    priority: 'low' | 'medium' | 'high';
    savedFromBankAccountId?: string;
    savedAmount?: number;
}


export type Loan = {
    id: string;
    userId: string;
    title: string;
    amount: number;
    installmentAmount: number;
    remainingAmount: number;
    startDate: string;
    paymentDay: number; // Day of the month
    numberOfInstallments: number;
    paidInstallments: number;
}

export type LoanPayment = {
    id: string;
    userId: string;
    loanId: string;
    bankAccountId: string;
    amount: number;
    paymentDate: string;
}

export type Transfer = {
    id: string;
    userId: string;
    fromBankAccountId: string;
    toBankAccountId: string;
    amount: number;
    transferDate: string;
    description?: string;
}
