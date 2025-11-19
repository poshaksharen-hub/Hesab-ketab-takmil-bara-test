'use client';

import { type Transaction, type Income, type Expense, type UserProfile, type Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Briefcase, ShoppingCart } from 'lucide-react';


type RecentTransactionsProps = {
  transactions: (Income | Expense)[];
  categories: Category[];
  users: UserProfile[];
};

export function RecentTransactions({ transactions, categories, users }: RecentTransactionsProps) {
    
  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">تراکنش اخیر یافت نشد.</p>
      </div>
    );
  }

  const getCategoryName = (id?: string) => {
    if (!id) return 'متفرقه';
    if (id === 'درآمد') return 'درآمد';
    return categories?.find(c => c.id === id)?.name || 'متفرقه';
  }

  const getRegisteredByUserName = (id: string) => {
      const user = users.find(u => u.id === id);
      return user ? user.firstName : 'نامشخص';
  }


  return (
    <div className="space-y-4">
      {transactions.map((transaction) => {
        const isIncome = 'source' in transaction;
        const categoryId = 'categoryId' in transaction ? transaction.categoryId : 'درآمد';
        const categoryName = getCategoryName(categoryId);
        const registeredById = 'registeredByUserId' in transaction ? transaction.registeredByUserId : transaction.userId;
        
        return (
          <div key={transaction.id} className="flex items-center">
            <Avatar className="h-9 w-9 rounded-md">
              <AvatarFallback className={`rounded-md ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-rose-100 dark:bg-rose-900'}`}>
                {isIncome ? <Briefcase className="h-4 w-4 text-emerald-500" /> : <ShoppingCart className="h-4 w-4 text-rose-500" />}
              </AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">{transaction.description}</p>
              <p className="text-sm text-muted-foreground">{categoryName} (ثبت: {getRegisteredByUserName(registeredById)})</p>
            </div>
            <div
              className={`mr-auto font-medium ${
                isIncome ? 'text-emerald-500 dark:text-emerald-400' : 'text-foreground'
              }`}
            >
              {isIncome ? '+' : '-'}
              {formatCurrency(transaction.amount, 'IRT')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
