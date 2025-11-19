'use client';

import { type Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { mockCategories } from '@/lib/data';

type RecentTransactionsProps = {
  transactions: Transaction[];
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">No recent transactions.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {transactions.map((transaction) => {
        const categoryDetails = mockCategories.find(c => c.label === transaction.category);
        const Icon = categoryDetails?.icon;
        
        return (
          <div key={transaction.id} className="flex items-center">
            <Avatar className="h-9 w-9 rounded-md">
              <AvatarFallback className="rounded-md bg-secondary">
                {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : transaction.category.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">{transaction.description}</p>
              <p className="text-sm text-muted-foreground">{transaction.category}</p>
            </div>
            <div
              className={`ml-auto font-medium ${
                transaction.type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-foreground'
              }`}
            >
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
