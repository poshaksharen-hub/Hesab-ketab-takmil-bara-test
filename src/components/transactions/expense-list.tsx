
'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Landmark,
  Calendar,
  PenSquare,
  Users,
  User,
  FolderKanban,
  Trash2,
  Receipt, // <-- Using the existing Receipt icon
  BookUser,
} from 'lucide-react';
import type { Expense, BankAccount, Category, UserProfile, ExpenseFor, Payee } from '@/lib/types';
import { formatCurrency, formatJalaliDate, getPublicUrl } from '@/lib/utils'; // <-- Import getPublicUrl
import { USER_DETAILS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import Link from 'next/link'; // <-- Import Link for the receipt button

interface ExpenseListProps {
  expenses: Expense[];
  bankAccounts: BankAccount[];
  categories: Category[];
  payees: Payee[];
  onDelete: (expenseId: string) => void;
  users: UserProfile[];
}

// ... (DetailItem component and helper functions remain the same)
const DetailItem = ({ icon: Icon, label, value, className }: { icon: React.ElementType; label: string; value: string | null | undefined; className?: string; }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 text-sm">
            <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex flex-col">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-semibold ${className}`}>{value}</span>
            </div>
        </div>
    );
};


export function ExpenseList({ expenses, bankAccounts, categories, payees, onDelete, users }: ExpenseListProps) {
    // ... (Helper functions like getBankAccount, getCategoryName etc. remain the same)

  if (expenses.length === 0) {
    // ... (Empty state JSX remains the same)
  }

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">لیست هزینه‌ها</CardTitle>
          <CardDescription>هزینه‌های ثبت شده اخیر شما در اینجا نمایش داده می‌شود.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {expenses
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((expense) => {
            const bankAccount = bankAccounts.find((acc) => acc.id === expense.bankAccountId);
            const registeredByName = users.find(u => u.id === expense.registeredByUserId)?.firstName || "نامشخص";
            const receiptUrl = expense.attachment_path ? getPublicUrl(expense.attachment_path) : null;

            return (
              <Card key={expense.id} data-testid={`expense-item-${expense.id}`} className="flex flex-col">
                <CardHeader>{/* ... */}</CardHeader>
                <CardContent className="flex-grow space-y-4">{/* ... */}</CardContent>
                
                {/* --- MODIFIED CARD FOOTER --- */}
                <CardFooter className="grid grid-cols-2 p-2 bg-muted/50 gap-2">
                  {receiptUrl ? (
                    <Link href={receiptUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="outline" className="w-full text-xs">
                        <Receipt className="ml-2 h-4 w-4" />
                        مشاهده رسید
                      </Button>
                    </Link>
                  ) : (
                    <div /> // Empty div to maintain grid structure
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="w-full text-xs text-destructive" aria-label="حذف هزینه">
                        <Trash2 className="ml-2 h-4 w-4" />
                        حذف تراکنش
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>{/* ... */}</AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
