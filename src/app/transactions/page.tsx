import { mockTransactions, mockCategories } from '@/lib/data';
import { TransactionsClient } from '@/components/transactions/transactions-client';

export default function TransactionsPage() {
  const transactions = mockTransactions;
  const categories = mockCategories.map(({value, label}) => ({value, label}));

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <TransactionsClient transactions={transactions} categories={categories} />
    </main>
  );
}
