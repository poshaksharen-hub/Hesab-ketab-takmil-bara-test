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

export type BankAccount = {
    id: string;
    userId: string;
    name: string;
    balance: number;
    initialBalance: number;
    isShared?: boolean;
}

export type Category = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon: LucideIcon;
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
}

export type Loan = {
    id: string;
    userId: string;
    bankAccountId: string;
    amount: number;
    interestRate: number;
    startDate: string;
    endDate: string;
    numberOfInstallments: number;
    paidInstallments: number;
}

export type LoanPayment = {
    id: string;
    loanId: string;
    bankAccountId: string;
    amount: number;
    paymentDate: string;
}

export type FinancialGoal = {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    isAchieved: boolean;
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
