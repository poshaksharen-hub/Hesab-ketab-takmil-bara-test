
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ExpensesPage from '@/app/transactions/page.tsx';
import { useUser, useFirestore } from '@/firebase';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { runTransaction } from 'firebase/firestore';
import { USER_DETAILS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

// --- JSDOM API Mocks (Good practice to keep them) ---
if (typeof window !== 'undefined') {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    window.HTMLElement.prototype.hasPointerCapture = jest.fn();
    window.HTMLElement.prototype.releasePointerCapture = jest.fn();
}

// --- Mocks Setup ---
jest.mock('@/firebase');
jest.mock('@/hooks/use-dashboard-data');
jest.mock('firebase/firestore', () => ({
    ...jest.requireActual('firebase/firestore'),
    runTransaction: jest.fn(),
    collection: jest.fn(),
    doc: jest.fn(),
    serverTimestamp: jest.fn(() => new Date()),
}));
jest.mock('next/link', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('@/lib/notifications', () => ({
    sendSystemNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('lucide-react', () => {
    const original = jest.requireActual('lucide-react');
    return { ...original, ArrowRight: () => <div />, Plus: () => <div />, PlusCircle: () => <div /> };
});

// --- Test Data ---
const mockUsers = [
    { id: 'ali_uid', ...USER_DETAILS.ali },
    { id: 'fatemeh_uid', ...USER_DETAILS.fatemeh },
];
const mockBankAccounts = [
    { id: 'ali_bank_1', bankName: 'Melli', balance: 100000, ownerId: 'ali', blockedBalance: 0 },
    { id: 'fati_bank_1', bankName: 'Sepah', balance: 150000, ownerId: 'fatemeh', blockedBalance: 20000 },
    { id: 'shared_bank_1', bankName: 'Saderat', balance: 500000, ownerId: 'shared_account', blockedBalance: 0 },
];
const mockCategories = [{ id: 'cat_food', name: 'Food' }];
const mockPayees = [{ id: 'payee_store', name: 'Hyperstar' }];

// --- The Final, Victorious Feature Test Suite ---
describe('Feature: Expense Management', () => {
    const testUsers = [
        { user: { uid: 'ali_uid', email: 'ali@khanevadati.app' }, name: 'Ali' },
        { user: { uid: 'fatemeh_uid', email: 'fatemeh@khanevadati.app' }, name: 'Fatemeh' },
    ];

    describe.each(testUsers)('when logged in as $name', ({ user }) => {
        let transactionUpdateSpy: jest.Mock;
        let transactionSetSpy: jest.Mock;

        beforeEach(() => {
            jest.clearAllMocks();
            (useUser as jest.Mock).mockReturnValue({ user, isUserLoading: false });
            (useFirestore as jest.Mock).mockReturnValue({ path: 'family-data' });
            // Corrected doc mock: It should only join segments as the app code provides the full path.
            (require('firebase/firestore').doc).mockImplementation((_firestore, ...segments) => ({
                path: segments.join('/'),
            }));

            transactionUpdateSpy = jest.fn();
            transactionSetSpy = jest.fn();
            (runTransaction as jest.Mock).mockImplementation(async (firestore, updateFunction) => {
                const transaction = {
                    get: jest.fn().mockImplementation((docRef) => {
                        const accountId = docRef.path.split('/').pop();
                        const account = mockBankAccounts.find(acc => acc.id === accountId);
                        return Promise.resolve({ exists: () => !!account, data: () => account });
                    }),
                    update: transactionUpdateSpy,
                    set: transactionSetSpy,
                };
                await updateFunction(transaction);
                return Promise.resolve();
            });
        });

        it('should create a new expense, update bank balance, and display it correctly in the list', async () => {
            // 1. ARRANGE
            const useDashboardDataMock = useDashboardData as jest.Mock;
            useDashboardDataMock.mockReturnValue({
                isLoading: false,
                allData: { expenses: [], bankAccounts: mockBankAccounts, categories: mockCategories, payees: mockPayees, users: mockUsers },
            });

            const { rerender } = render(<ExpensesPage />);

            // 2. ACT
            fireEvent.click(screen.getByTestId('add-new-expense-desktop'));
            await waitFor(() => expect(screen.getByRole('heading', { name: 'ثبت هزینه جدید' })).toBeInTheDocument());

            // -- Fill the form --
            fireEvent.input(screen.getByLabelText(/شرح هزینه/i), { target: { value: 'Weekly Groceries' } });
            fireEvent.input(screen.getByLabelText(/مبلغ/i), { target: { value: '75000' } });

            // -- The Ultimate Select Strategy: Target the hidden <select> inside the wrapper --
            const bankSelect = screen.getByTestId('bank-account-select-wrapper').querySelector('select');
            const categorySelect = screen.getByTestId('category-select-wrapper').querySelector('select');
            const payeeSelect = screen.getByTestId('payee-select-wrapper').querySelector('select');
            const expenseForSelect = screen.getByTestId('expense-for-select-wrapper').querySelector('select');

            fireEvent.change(bankSelect!, { target: { value: 'shared_bank_1' } });
            fireEvent.change(categorySelect!, { target: { value: 'cat_food' } });
            fireEvent.change(payeeSelect!, { target: { value: 'payee_store' } });
            fireEvent.change(expenseForSelect!, { target: { value: 'shared' } });

            // -- Submit the form --
            fireEvent.click(screen.getByRole('button', { name: /ذخیره/i }));

            // 3. ASSERT (Backend)
            await waitFor(() => expect(runTransaction).toHaveBeenCalled());

            const sharedAccount = mockBankAccounts.find(a => a.id === 'shared_bank_1')!;
            const expectedNewBalance = sharedAccount.balance - 75000;
            expect(transactionUpdateSpy).toHaveBeenCalledWith(expect.objectContaining({ path: 'family-data/shared-data/bankAccounts/shared_bank_1' }), { balance: expectedNewBalance });

            const submittedData = transactionSetSpy.mock.calls[0][1];
            expect(submittedData).toMatchObject({
                description: 'Weekly Groceries', amount: 75000, bankAccountId: 'shared_bank_1',
                categoryId: 'cat_food', payeeId: 'payee_store', expenseFor: 'shared',
                registeredByUserId: user.uid, ownerId: 'shared_account',
            });

            // 4. ARRANGE (UI Update)
            const newExpenseForUI = { ...submittedData, id: 'new_exp_1', date: new Date().toISOString() };
            const updatedBankAccounts = mockBankAccounts.map(acc => acc.id === 'shared_bank_1' ? { ...acc, balance: expectedNewBalance } : acc);

            useDashboardDataMock.mockReturnValue({
                isLoading: false,
                allData: { expenses: [newExpenseForUI], bankAccounts: updatedBankAccounts, categories: mockCategories, payees: mockPayees, users: mockUsers },
            });

            rerender(<ExpensesPage />);

            // 5. ASSERT (UI Display)
            await waitFor(() => {
                const expenseCard = screen.getByTestId('expense-item-new_exp_1');
                expect(expenseCard).toBeInTheDocument();

                const registrarFirstName = user.uid === 'ali_uid' ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName;
                expect(within(expenseCard).getByText(registrarFirstName)).toBeInTheDocument();
                expect(within(expenseCard).getByText((content) => content.startsWith('مشترک'))).toBeInTheDocument();
                expect(within(expenseCard).getByText((content) => content.startsWith('Saderat'))).toBeInTheDocument();
                expect(within(expenseCard).getByText('Food')).toBeInTheDocument();
                expect(within(expenseCard).getByText('Hyperstar')).toBeInTheDocument();
                expect(within(expenseCard).getByText(`-${formatCurrency(75000, 'IRT')}`)).toBeInTheDocument();
            });
        });
    });
});
