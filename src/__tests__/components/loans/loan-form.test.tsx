
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoanForm } from '@/components/loans/loan-form';
import { BankAccount, Loan, Payee } from '@/lib/types';

const mockOnCancel = jest.fn();
const mockOnSubmit = jest.fn();

const mockBankAccounts: BankAccount[] = [
  { id: 'acc1', bankName: 'Bank A', balance: 1000, ownerId: 'ali' },
  { id: 'acc2', bankName: 'Bank B', balance: 2000, ownerId: 'fatemeh' },
];

const mockPayees: Payee[] = [
  { id: 'payee1', name: 'Payee 1' },
  { id: 'payee2', name: 'Payee 2' },
];

const mockInitialData: Loan = {
    id: 'loan1',
    title: 'Test Loan',
    amount: 5000,
    startDate: new Date().toISOString(),
    ownerId: 'shared',
    payeeId: 'payee1',
    installmentAmount: 500,
    numberOfInstallments: 10,
    paymentDay: 15,
};

describe('LoanForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with initial data for editing', () => {
    render(
      <LoanForm
        onCancel={mockOnCancel}
        onSubmit={mockOnSubmit}
        initialData={mockInitialData}
        bankAccounts={mockBankAccounts}
        payees={mockPayees}
      />
    );

    expect(screen.getByLabelText(/عنوان وام/i)).toHaveValue(mockInitialData.title);
    expect(screen.getByLabelText(/مبلغ کل وام/i)).toHaveValue(mockInitialData.amount);
    // Add more assertions for other fields
  });

  it('renders a new loan form correctly', () => {
    render(
      <LoanForm
        onCancel={mockOnCancel}
        onSubmit={mockOnSubmit}
        initialData={null}
        bankAccounts={mockBankAccounts}
        payees={mockPayees}
      />
    );

    expect(screen.getByText(/ثبت وام جدید/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/عنوان وام/i)).toHaveValue('');
  });

  it('calls onCancel when the cancel button is clicked', () => {
    render(
      <LoanForm
        onCancel={mockOnCancel}
        onSubmit={mockOnSubmit}
        initialData={null}
        bankAccounts={mockBankAccounts}
        payees={mockPayees}
      />
    );

    fireEvent.click(screen.getByText(/لغو/i));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors for invalid data', async () => {
    render(
      <LoanForm
        onCancel={mockOnCancel}
        onSubmit={mockOnSubmit}
        initialData={null}
        bankAccounts={mockBankAccounts}
        payees={mockPayees}
      />
    );

    fireEvent.click(screen.getByText(/ذخیره/i));

    expect(await screen.findByText(/عنوان وام باید حداقل ۲ حرف داشته باشد./i)).toBeInTheDocument();
    expect(await screen.findByText(/مبلغ وام باید یک عدد مثبت باشد./i)).toBeInTheDocument();
  });

  it('submits the form with correct data', async () => {
    const user = userEvent.setup();
    render(
      <LoanForm
        onCancel={mockOnCancel}
        onSubmit={mockOnSubmit}
        initialData={null}
        bankAccounts={mockBankAccounts}
        payees={mockPayees}
      />
    );

    await user.type(screen.getByLabelText(/عنوان وام/i), 'New Loan');
    await user.type(screen.getByLabelText(/مبلغ کل وام/i), '10000');

    fireEvent.click(screen.getByText(/ذخیره/i));

    expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Loan',
        amount: 10000,
    }));
  });

  it('toggles deposit to account fields correctly', async () => {
    const user = userEvent.setup();
    render(
      <LoanForm
        onCancel={mockOnCancel}
        onSubmit={mockOnSubmit}
        initialData={null}
        bankAccounts={mockBankAccounts}
        payees={mockPayees}
      />
    );

    const depositSwitch = screen.getByLabelText(/واریز مبلغ وام به حساب/i);
    expect(screen.queryByLabelText(/واریز به کارت/i)).not.toBeInTheDocument();

    await user.click(depositSwitch);

    expect(screen.getByLabelText(/واریز به کارت/i)).toBeInTheDocument();
  });
});
