
import {
    BankAccount, Category, Payee, Income, Expense, Check, Loan, LoanPayment,
    FinancialGoal, FinancialGoalContribution, PreviousDebt, DebtPayment, Transfer
} from './types';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate dates relative to today
const getDate = (daysAgo: number = 0, monthsAgo: number = 0, yearsAgo: number = 0): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setMonth(date.getMonth() - monthsAgo);
    date.setFullYear(date.getFullYear() - yearsAgo);
    return date.toISOString();
};

export const getSeedData = (userId: string) => {

    // --- BASE DATA ---
    const categories: Category[] = [
        { id: 'cat-food', name: 'خورد و خوراک', description: 'رستوران، کافه، مواد غذایی' },
        { id: 'cat-transport', name: 'حمل و نقل', description: 'تاکسی، بنزین، تعمیرات' },
        { id: 'cat-housing', name: 'مسکن', description: 'اجاره، قبض‌ها، تعمیرات' },
        { id: 'cat-apparel', name: 'پوشاک', description: 'لباس، کفش، اکسسوری' },
        { id: 'cat-entertainment', name: 'تفریح و سرگرمی', description: 'سینما، سفر، سرگرمی' },
        { id: 'cat-health', name: 'سلامت و درمان', description: 'پزشک، دارو، بیمه' },
        { id: 'cat-installments', name: 'اقساط و بدهی', description: 'پرداخت وام و بدهی' },
        { id: 'cat-investment', name: 'سرمایه‌گذاری', description: 'خرید سهام، طلا و...' },
        { id: 'cat-misc', name: 'متفرقه', description: 'هزینه‌های پیش‌بینی نشده' },
    ];

    const payees: Payee[] = [
        { id: 'payee-hyperstar', name: 'فروشگاه هایپراستار' },
        { id: 'payee-snapp', name: 'اسنپ' },
        { id: 'payee-digikala', name: 'دیجی‌کالا' },
        { id: 'payee-bank-mellat', name: 'بانک ملت' },
        { id: 'payee-friend-reza', name: 'رضا احمدی' },
    ];

    // --- BANK ACCOUNTS ---
    const bankAccounts: BankAccount[] = [
        {
            id: 'acc-ali-1', ownerId: 'ali', bankName: 'بانک آینده', accountNumber: '11111', cardNumber: '6362141000001111',
            expiryDate: '10/28', cvv2: '111', accountType: 'savings', balance: 15_250_000, initialBalance: 10_000_000, theme: 'orange'
        },
        {
            id: 'acc-fatemeh-1', ownerId: 'fatemeh', bankName: 'بانک پاسارگاد', accountNumber: '22222', cardNumber: '5022291000002222',
            expiryDate: '12/29', cvv2: '222', accountType: 'savings', balance: 22_500_000, initialBalance: 5_000_000, theme: 'teal'
        },
        {
            id: 'acc-shared-1', ownerId: 'shared_account', bankName: 'بانک ملت', accountNumber: '33333', cardNumber: '6104337000003333',
            expiryDate: '08/27', cvv2: '333', accountType: 'checking', balance: 5_800_000, initialBalance: 1_000_000, theme: 'red', blockedBalance: 5_000_000
        },
        {
            id: 'acc-ali-2', ownerId: 'ali', bankName: 'بلوبانک (سامان)', accountNumber: '44444', cardNumber: '6219861000004444',
            expiryDate: '01/30', cvv2: '444', accountType: 'savings', balance: 2_100_000, initialBalance: 0, theme: 'blue'
        }
    ];

    // --- INCOMES ---
    const incomes: Income[] = [
        {
            id: 'inc-1', ownerId: 'ali', registeredByUserId: userId, bankAccountId: 'acc-ali-1', amount: 18_000_000,
            date: getDate(15), description: 'حقوق ماهانه علی', source: 'شرکت رادمان', type: 'income', category: 'درآمد',
            createdAt: new Date(), balanceAfter: 18_000_000
        },
        {
            id: 'inc-2', ownerId: 'fatemeh', registeredByUserId: userId, bankAccountId: 'acc-fatemeh-1', amount: 15_000_000,
            date: getDate(14), description: 'حقوق ماهانه فاطمه', source: 'شرکت نوآوران', type: 'income', category: 'درآمد',
            createdAt: new Date(), balanceAfter: 15_000_000
        },
        {
            id: 'inc-3', ownerId: 'daramad_moshtarak', registeredByUserId: userId, bankAccountId: 'acc-shared-1', amount: 5_000_000,
            date: getDate(5), description: 'سود پروژه مشترک', source: 'پروژه فریلنس', type: 'income', category: 'درآمد',
            createdAt: new Date(), balanceAfter: 5_000_000
        }
    ];

    // --- GOALS & CONTRIBUTIONS ---
    const goals: FinancialGoal[] = [
        {
            id: 'goal-1', registeredByUserId: userId, ownerId: 'shared', name: 'سفر به استانبول', targetAmount: 80_000_000,
            currentAmount: 5_000_000, targetDate: getDate(-90), isAchieved: false, priority: 'high',
            contributions: [
                { bankAccountId: 'acc-shared-1', amount: 5_000_000, date: getDate(10) }
            ]
        },
        {
            id: 'goal-2', registeredByUserId: userId, ownerId: 'ali', name: 'خرید لپ‌تاپ جدید', targetAmount: 65_000_000,
            currentAmount: 65_000_000, actualCost: 63_500_000, targetDate: getDate(40), isAchieved: true, priority: 'medium',
            contributions: [
                { bankAccountId: 'acc-ali-1', amount: 65_000_000, date: getDate(40) }
            ]
        }
    ];

    // --- LOANS ---
    const loans: Loan[] = [
        {
            id: 'loan-1', registeredByUserId: userId, ownerId: 'shared', payeeId: 'payee-bank-mellat', title: 'وام خرید مسکن',
            amount: 500_000_000, installmentAmount: 10_000_000, remainingAmount: 480_000_000, startDate: getDate(0, 2),
            paymentDay: 5, numberOfInstallments: 60, paidInstallments: 2, depositToAccountId: 'acc-shared-1'
        }
    ];
    const loanPayments: LoanPayment[] = [
        { id: 'lp-1', registeredByUserId: userId, loanId: 'loan-1', bankAccountId: 'acc-shared-1', amount: 10_000_000, paymentDate: getDate(0, 1, 0) },
        { id: 'lp-2', registeredByUserId: userId, loanId: 'loan-1', bankAccountId: 'acc-shared-1', amount: 10_000_000, paymentDate: getDate(0, 0, 0) }
    ];

    // --- DEBTS ---
    const previousDebts: PreviousDebt[] = [
        {
            id: 'debt-1', registeredByUserId: userId, ownerId: 'ali', payeeId: 'payee-friend-reza', description: 'قرض برای خرید گوشی',
            amount: 10_000_000, remainingAmount: 5_000_000, startDate: getDate(50), isInstallment: false, dueDate: getDate(-20)
        }
    ];
    const debtPayments: DebtPayment[] = [
        { id: 'dp-1', registeredByUserId: userId, debtId: 'debt-1', bankAccountId: 'acc-ali-2', amount: 5_000_000, paymentDate: getDate(20) }
    ];

    // --- CHECKS ---
    const checks: Check[] = [
        {
            id: 'check-1', registeredByUserId: userId, liabilityOwnerId: 'shared_account', expenseFor: 'shared', bankAccountId: 'acc-shared-1',
            payeeId: 'payee-digikala', categoryId: 'cat-misc', amount: 2_500_000, issueDate: getDate(20), dueDate: getDate(-10),
            status: 'pending', sayadId: '1234567890123456', checkSerialNumber: 'AB-123'
        },
        {
            id: 'check-2', registeredByUserId: userId, liabilityOwnerId: 'fatemeh', expenseFor: 'fatemeh', bankAccountId: 'acc-fatemeh-1',
            payeeId: 'payee-hyperstar', categoryId: 'cat-food', amount: 1_800_000, issueDate: getDate(35), dueDate: getDate(30),
            status: 'cleared', clearedDate: getDate(30), sayadId: '1234567890123457', checkSerialNumber: 'CD-456'
        }
    ];

    // --- EXPENSES ---
    const expenses: Expense[] = [
        {
            id: 'exp-1', ownerId: 'ali', registeredByUserId: userId, bankAccountId: 'acc-ali-2', categoryId: 'cat-transport',
            payeeId: 'payee-snapp', amount: 55_000, date: getDate(2), description: 'اسنپ تا محل کار', type: 'expense', expenseFor: 'ali'
        },
        {
            id: 'exp-2', ownerId: 'fatemeh', registeredByUserId: userId, bankAccountId: 'acc-fatemeh-1', categoryId: 'cat-food',
            payeeId: 'payee-hyperstar', amount: 1_200_000, date: getDate(5), description: 'خرید هفتگی منزل', type: 'expense', expenseFor: 'shared'
        },
        // Expense for cleared check
        {
            id: 'exp-check-2', ownerId: 'fatemeh', registeredByUserId: userId, bankAccountId: 'acc-fatemeh-1', categoryId: 'cat-food',
            payeeId: 'payee-hyperstar', amount: 1_800_000, date: getDate(30), description: 'پاس کردن چک به: هایپراستار', type: 'expense',
            expenseFor: 'fatemeh', checkId: 'check-2'
        },
        // Expense for loan payment
        {
            id: 'exp-lp-1', ownerId: 'shared_account', registeredByUserId: userId, bankAccountId: 'acc-shared-1', categoryId: 'cat-installments',
            amount: 10_000_000, date: getDate(0, 1, 0), description: 'پرداخت قسط وام: وام خرید مسکن', type: 'expense', loanPaymentId: 'lp-1', expenseFor: 'shared'
        },
        {
            id: 'exp-lp-2', ownerId: 'shared_account', registeredByUserId: userId, bankAccountId: 'acc-shared-1', categoryId: 'cat-installments',
            amount: 10_000_000, date: getDate(0, 0, 0), description: 'پرداخت قسط وام: وام خرید مسکن', type: 'expense', loanPaymentId: 'lp-2', expenseFor: 'shared'
        },
        // Expense for debt payment
        {
            id: 'exp-dp-1', ownerId: 'ali', registeredByUserId: userId, bankAccountId: 'acc-ali-2', categoryId: 'cat-installments',
            payeeId: 'payee-friend-reza', amount: 5_000_000, date: getDate(20), description: 'پرداخت بدهی: قرض برای خرید گوشی', type: 'expense',
            debtPaymentId: 'dp-1', expenseFor: 'ali'
        },
        // Expense for achieved goal
        {
            id: 'exp-goal-2', ownerId: 'ali', registeredByUserId: userId, bankAccountId: 'acc-ali-1', categoryId: 'cat-investment',
            amount: 63_500_000, date: getDate(40), description: 'تحقق هدف: خرید لپ‌تاپ جدید', type: 'expense', goalId: 'goal-2', expenseFor: 'ali'
        }
    ];

    // --- TRANSFERS ---
    const transfers: Transfer[] = [
        {
            id: 'trans-1', registeredByUserId: userId, fromBankAccountId: 'acc-ali-1', toBankAccountId: 'acc-shared-1',
            amount: 2_000_000, transferDate: getDate(8), description: 'انتقال برای مخارج مشترک',
            fromAccountBalanceBefore: 20_000_000, fromAccountBalanceAfter: 18_000_000,
            toAccountBalanceBefore: 3_000_000, toAccountBalanceAfter: 5_000_000
        }
    ];


    return {
        bankAccounts, categories, payees, incomes, expenses, checks,
        loans, loanPayments, goals, previousDebts, debtPayments, transfers
    };
};

    