
import React from 'react';
import { render, screen } from '@testing-library/react';
import { OverallSummary } from '@/components/dashboard/overall-summary';
import { formatCurrency } from '@/lib/utils';

describe('OverallSummary', () => {
  const mockSummary = {
    totalIncome: 5000000,
    totalExpense: 1500000,
    netWorth: 120000000,
    totalAssets: 150000000,
    totalLiabilities: 30000000,
    pendingChecksAmount: 5000000,
    remainingLoanAmount: 20000000,
    remainingDebtsAmount: 5000000,
    totalSavedForGoals: 10000000,
  };

  it('renders all summary cards with correctly formatted values', () => {
    render(<OverallSummary filteredSummary={mockSummary} />);

    // Check for Net Worth
    expect(screen.getByText('دارایی خالص')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(mockSummary.netWorth, 'IRT'))).toBeInTheDocument();

    // Check for Total Assets
    expect(screen.getByText('کل دارایی')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(mockSummary.totalAssets, 'IRT'))).toBeInTheDocument();
    
    // Check for Total Income
    expect(screen.getByText('کل درآمد')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(mockSummary.totalIncome, 'IRT'))).toBeInTheDocument();

    // Check for Total Expense
    expect(screen.getByText('کل هزینه')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(mockSummary.totalExpense, 'IRT'))).toBeInTheDocument();
    
    // Check for Loan Debts
    expect(screen.getByText('بدهی وام‌ها')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(mockSummary.remainingLoanAmount, 'IRT'))).toBeInTheDocument();

    // Check for Check Debts
    expect(screen.getByText('بدهی چک‌ها')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(mockSummary.pendingChecksAmount, 'IRT'))).toBeInTheDocument();

    // Check for Miscellaneous Debts
    expect(screen.getByText('بدهی‌های متفرقه')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(mockSummary.remainingDebtsAmount, 'IRT'))).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroSummary = {
        totalIncome: 0,
        totalExpense: 0,
        netWorth: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        pendingChecksAmount: 0,
        remainingLoanAmount: 0,
        remainingDebtsAmount: 0,
        totalSavedForGoals: 0,
    };
    render(<OverallSummary filteredSummary={zeroSummary} />);

    // Just check one value to confirm it renders "۰ تومان"
    expect(screen.getAllByText('۰ تومان').length).toBeGreaterThan(0);
  });
});
