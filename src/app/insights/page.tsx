
'use client';
import React, { useMemo, useState, useTransition, useRef, useEffect } from 'react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { USER_DETAILS } from '@/lib/constants';
import { useUser } from '@/firebase';
import { getFinancialInsightsAction, type FinancialInsightsInput, type FinancialInsightsOutput, type ChatHistory } from './actions';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendHorizonal, User, Sparkles, BrainCircuit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';


type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export default function InsightsPage() {
  const { user } = useUser();
  const { isLoading, allData } = useDashboardData();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const financialData = useMemo((): Omit<FinancialInsightsInput, 'history' | 'latestUserQuestion'> | null => {
    if (isLoading || !allData || !user) return null;

    const { incomes, expenses, bankAccounts, categories, payees, users, checks, loans, previousDebts, goals } = allData;
    
    const currentUserEmail = user.email || '';
    const currentUserName = currentUserEmail.startsWith('ali') ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName;


    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'نامشخص';
    const getPayeeName = (id: string) => payees.find(p => p.id === id)?.name || 'نامشخص';
    const getBankAccountName = (id: string) => {
        const account = bankAccounts.find(b => b.id === id);
        if (!account) return 'نامشخص';
        const ownerName = account.ownerId === 'shared' ? 'مشترک' : (account.ownerId in USER_DETAILS ? USER_DETAILS[account.ownerId as 'ali' | 'fatemeh']?.firstName : 'ناشناس');
        return `${account.bankName} (${ownerName})`;
    };
    const getUserName = (id: string) => users.find(u => u.id === id)?.firstName || 'ناشناس';
    
    const enrichedIncomes = incomes.map(income => ({
        description: income.description,
        amount: income.amount,
        date: income.date,
        bankAccountName: getBankAccountName(income.bankAccountId),
        source: income.source,
    }));

    const enrichedExpenses = expenses.map(expense => {
      const expenseFor = expense.expenseFor;
      let expenseForName = 'مشترک';
      if (expenseFor && (expenseFor === 'ali' || expenseFor === 'fatemeh')) {
        expenseForName = USER_DETAILS[expenseFor]?.firstName || 'مشترک';
      }

      return {
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        bankAccountName: getBankAccountName(expense.bankAccountId),
        categoryName: getCategoryName(expense.categoryId),
        payeeName: expense.payeeId ? getPayeeName(expense.payeeId) : undefined,
        expenseFor: expenseForName,
      };
    });

    const enrichedChecks = checks.filter(c => c.status === 'pending').map(check => ({
        description: check.description,
        amount: check.amount,
        dueDate: check.dueDate,
        payeeName: getPayeeName(check.payeeId),
        bankAccountName: getBankAccountName(check.bankAccountId),
    }));

    const enrichedLoans = loans.filter(l => l.remainingAmount > 0).map(loan => ({
        title: loan.title,
        remainingAmount: loan.remainingAmount,
        installmentAmount: loan.installmentAmount,
        payeeName: loan.payeeId ? getPayeeName(loan.payeeId) : 'نامشخص',
    }));

    const enrichedDebts = previousDebts.filter(d => d.remainingAmount > 0).map(debt => ({
        description: debt.description,
        remainingAmount: debt.remainingAmount,
        payeeName: getPayeeName(debt.payeeId),
    }));

    const enrichedGoals = goals.map(goal => ({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      priority: goal.priority,
      isAchieved: goal.isAchieved
    }));


    return {
      currentUserName,
      incomes: enrichedIncomes,
      expenses: enrichedExpenses,
      bankAccounts: bankAccounts.map(b => ({ bankName: b.bankName, balance: b.balance, ownerId: b.ownerId })),
      checks: enrichedChecks,
      loans: enrichedLoans,
      previousDebts: enrichedDebts,
      financialGoals: enrichedGoals,
    };
  }, [isLoading, allData, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !financialData) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setError(null);

    startTransition(async () => {
      const result = await getFinancialInsightsAction(financialData, newMessages);

      if (result.success && result.data) {
        setMessages(prev => [...prev, { role: 'model', content: result.data!.summary || '' }]);
      } else {
        setError(result.error || 'Failed to get a response.');
        // Revert user message on error
        setMessages(messages);
      }
    });
  };
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollable = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (scrollable) {
            scrollable.scrollTop = scrollable.scrollHeight;
        }
    }
  }, [messages]);

  const userShortName = user?.email?.startsWith('ali') ? 'ali' : 'fatemeh';
  const userAvatar = getPlaceholderImage(`${userShortName}-avatar`);
  
  if (isLoading) {
      return (
          <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <div className="border rounded-lg p-4 space-y-4 mt-4">
                <Skeleton className="h-16 w-1/2" />
                <Skeleton className="h-16 w-1/2 ml-auto" />
                <Skeleton className="h-16 w-1/2" />
            </div>
          </main>
      )
  }

  return (
    <main className="flex flex-col h-[calc(100vh-8rem)] p-4 pt-6 md:p-8">
      <div className="mb-4">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          تحلیل هوشمند مالی
        </h1>
        <p className="text-muted-foreground">
          از قدرت هوش مصنوعی برای تحلیل عادت‌های مالی و دریافت پیشنهادهای شخصی‌سازی شده استفاده کنید.
        </p>
      </div>

      <Card className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col p-4">
          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            {messages.length === 0 && !isPending && (
                 <div className="flex h-full flex-col items-center justify-center text-center">
                    <BrainCircuit className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold">مشاور مالی شما</h3>
                    <p className="text-muted-foreground">می‌توانید با پرسیدن «یک تحلیل کلی به من بده» شروع کنید.</p>
                </div>
            )}
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' && "justify-end")}>
                  {msg.role === 'model' && (
                     <Avatar className="w-8 h-8 border">
                        <AvatarFallback><Sparkles className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("max-w-prose rounded-lg bg-muted px-4 py-3 text-sm", msg.role === 'user' && "bg-primary text-primary-foreground")}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="w-8 h-8 border">
                        <AvatarImage src={userAvatar?.imageUrl} />
                        <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isPending && (
                  <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8 border">
                        <AvatarFallback><Sparkles className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div className="max-w-prose rounded-lg bg-muted px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Sparkles className="w-4 h-4 animate-spin" />
                              <span>در حال فکر کردن...</span>
                          </div>
                      </div>
                  </div>
              )}
               {error && (
                <Alert variant="destructive" className="max-w-prose">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>خطا در پردازش</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
          <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 border-t pt-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="یک سوال در مورد وضعیت مالی خود بپرسید..."
              className="flex-1"
              disabled={isPending}
            />
            <Button type="submit" disabled={isPending || !input.trim()}>
              <SendHorizonal className="h-4 w-4" />
              <span className="sr-only">ارسال</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
