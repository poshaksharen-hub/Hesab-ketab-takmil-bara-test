'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AddTransactionSheet } from './add-transaction-sheet';
import { type Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { PlusCircle } from 'lucide-react';

interface TransactionsClientProps {
  transactions: Transaction[];
  categories: { value: string; label: string }[];
}

export function TransactionsClient({ transactions: initialTransactions, categories }: TransactionsClientProps) {
  const [transactions, setTransactions] = React.useState(initialTransactions);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id' | 'date'>) => {
    const fullTransaction = {
      ...newTransaction,
      id: (transactions.length + 1).toString(),
      date: new Date().toISOString().split('T')[0],
    };
    setTransactions([fullTransaction, ...transactions]);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Transactions
        </h1>
        <Button onClick={() => setIsSheetOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.description}</div>
                    <div className="text-sm text-muted-foreground md:hidden">
                        {new Date(t.date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{t.category}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{new Date(t.date).toLocaleDateString()}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      t.type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-foreground'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatCurrency(t.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddTransactionSheet
        isOpen={isSheetOpen}
        setIsOpen={setIsSheetOpen}
        onAddTransaction={handleAddTransaction}
        categories={categories}
      />
    </>
  );
}
