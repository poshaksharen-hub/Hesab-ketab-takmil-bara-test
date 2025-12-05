
import type { LucideIcon } from 'lucide-react';

// Defines who OWNS an asset (BankAccount) or income source (Income).
// 'ali', 'fatemeh': Personal ownership
// 'shared_account': Represents the shared bank account. Used ONLY for BankAccounts.
// 'daramad_moshtarak': Represents the shared business/income source. Used ONLY for Incomes.
export type OwnerId = 'ali' | 'fatemeh' | 'shared_account' | 'daramad_moshtarak';

// Defines who an EXPENSE, LIABILITY or GOAL is FOR. This is about the beneficiary.
// This is completely separate from OwnerId.
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
  liabilityOwnerId: 'ali' | 'fatemeh' | 'shared_account'; // Owner of the bank account used for payment
  registeredByUserId: string;
  bankAccountId: string;
  categoryId: string;
  payeeId?: string; // Optional payee for direct expenses
  amount: number;
  date: string;
  description: string;
  type: 'expense';
  subType?: 'goal_saved_portion' | 'goal_cash_portion' | 'debt_payment'; // For differentiating special expenses
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
    blockedBalance?: number;
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
    liabilityOwnerId: 'ali' | 'fatemeh' | 'shared_account'; // The liability belongs to a person or the shared account
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
};

export type FinancialGoal = {
    id: string;
    registeredByUserId: string;
    ownerId: 'ali' | 'fatemeh' | 'shared'; // A goal can be for a person or a shared family goal
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
    expenseFor: ExpenseFor; // Who the loan is for (beneficiary)
    liabilityOwnerId: 'ali' | 'fatemeh' | 'shared_account'; // Which account owner is responsible for the deposit/repayment logic
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
    expenseFor: ExpenseFor; // Who the debt is for (beneficiary)
    payeeId: string;
    description: string;
    amount: number;
    remainingAmount: number;
    startDate: string;
    paymentDay?: number; // Optional day for recurring payment reminders
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
