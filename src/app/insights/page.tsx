
'use client';

import React, { useState, useMemo, useTransition, useRef, useEffect } from 'react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useUser } from '@/firebase';
import { USER_DETAILS } from '@/lib/constants';
import { getFinancialInsightsAction, type FinancialInsightsInput, type ChatHistory, type FinancialInsightsOutput } from './actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, BrainCircuit, User as UserIcon, AlertTriangle, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function ChatMessage({ role, content }: { role: 'user' | 'model', content: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <Avatar className="size-8 border">
          <AvatarFallback className="bg-primary/10 text-primary">
            <BrainCircuit className="size-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2 ${
          isUser
            ? 'rounded-br-none bg-primary text-primary-foreground'
            : 'rounded-bl-none bg-muted'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{content}</p>
      </div>
      {isUser && (
        <Avatar className="size-8 border">
          <AvatarFallback>
            <UserIcon className="size-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function InsightsPageSkeleton() {
    return (
        <main className="flex flex-1 flex-col p-4 md:p-6">
            <div className="flex items-center pb-4">
                <h1 className="font-headline text-2xl font-bold">مشاور مالی هوشمند</h1>
            </div>
            <div className="flex-1 space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </main>
    );
}

export default function InsightsPage() {
  const { user, isUserLoading } = useUser();
  const { allData, isLoading: isDashboardLoading } = useDashboardData();
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  const financialData = useMemo((): Omit<FinancialInsightsInput, 'history' | 'latestUserQuestion'> | null => {
    if (isDashboardLoading || !user) return null;
    const { incomes, expenses, bankAccounts, checks, loans, previousDebts, goals, payees, categories } = allData;
    const currentUserName = user.email?.startsWith('ali') ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName;
    
    return {
      currentUserName,
      incomes: (incomes || []).map(i => ({
          description: i.description,
          amount: i.amount,
          date: i.date,
          bankAccountName: bankAccounts.find(b => b.id === i.bankAccountId)?.bankName || 'N/A',
          source: i.source,
      })),
      expenses: (expenses || []).map(e => ({
          description: e.description,
          amount: e.amount,
          date: e.date,
          bankAccountName: bankAccounts.find(b => b.id === e.bankAccountId)?.bankName || 'N/A',
          categoryName: categories.find(c => c.id === e.categoryId)?.name || 'N/A',
          payeeName: payees.find(p => p.id === e.payeeId)?.name,
          expenseFor: e.expenseFor,
      })),
      bankAccounts: (bankAccounts || []).map(b => ({
          bankName: b.bankName,
          balance: b.balance,
          ownerId: b.ownerId,
      })),
      checks: (checks || []).filter(c => c.status === 'pending').map(c => ({
          description: c.description,
          amount: c.amount,
          dueDate: c.dueDate,
          payeeName: payees.find(p => p.id === c.payeeId)?.name || 'N/A',
          bankAccountName: bankAccounts.find(b => b.id === c.bankAccountId)?.bankName || 'N/A',
      })),
      loans: (loans || []).filter(l => l.remainingAmount > 0).map(l => ({
          title: l.title,
          remainingAmount: l.remainingAmount,
          installmentAmount: l.installmentAmount,
          payeeName: payees.find(p => p.id === l.payeeId)?.name || 'N/A',
      })),
      previousDebts: (previousDebts || []).filter(d => d.remainingAmount > 0).map(d => ({
          description: d.description,
          remainingAmount: d.remainingAmount,
          payeeName: payees.find(p => p.id === d.payeeId)?.name || 'N/A',
      })),
      financialGoals: (goals || []).filter(g => !g.isAchieved).map(g => ({
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          targetDate: g.targetDate,
          priority: g.priority,
          isAchieved: g.isAchieved,
      })),
    };
  }, [allData, isDashboardLoading, user]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const newUserMessage: ChatHistory = { role: 'user', content: input };
    const newHistory = [...history, newUserMessage];
    setHistory(newHistory);
    setInput('');
    
    startTransition(async () => {
      const result = await getFinancialInsightsAction(financialData, newHistory);
      if (result.success && result.data) {
        setHistory(prev => [...prev, { role: 'model', content: result.data!.summary }]);
      } else {
        const errorMessage = result.error || 'یک خطای ناشناخته رخ داد.';
        setHistory(prev => [...prev, { role: 'model', content: `خطا در پردازش: ${errorMessage}` }]);
      }
    });
  };
  
  if (isUserLoading || isDashboardLoading) {
      return <InsightsPageSkeleton />;
  }

  return (
    <main className="flex h-[calc(100vh-theme(space.14))] flex-col p-4 md:p-6">
      <Card className="flex h-full flex-col">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-xl">مشاور مالی شما</CardTitle>
          <CardDescription>از قدرت هوش مصنوعی برای تحلیل عادت‌های مالی و دریافت پیشنهادهای شخصی‌سازی شده استفاده کنید.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4 pr-2">
              {history.length === 0 && (
                 <div className="flex h-full items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <BrainCircuit className="mx-auto size-12" />
                        <p className="mt-2 font-bold">آماده برای تحلیل</p>
                        <p className="text-sm">می‌توانید با پرسیدن «یک تحلیل کلی به من بده» شروع کنید.</p>
                    </div>
                </div>
              )}
              {history.map((msg, index) => (
                <ChatMessage key={index} role={msg.role} content={msg.content} />
              ))}
               {isPending && (
                <div className="flex items-start gap-3">
                    <Avatar className="size-8 border">
                        <AvatarFallback className="bg-primary/10 text-primary">
                            <BrainCircuit className="size-5" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[75%] rounded-xl rounded-bl-none bg-muted px-4 py-2">
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Sparkles className="size-4 animate-spin" />
                            <span>در حال فکر کردن...</span>
                       </div>
                    </div>
                </div>
               )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="border-t pt-6">
            {!financialData && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>خطا در بارگذاری داده‌ها</AlertTitle>
                    <AlertDescription>
                        اطلاعات مالی مورد نیاز برای تحلیل بارگذاری نشد. لطفا صفحه را رفرش کنید.
                    </AlertDescription>
                </Alert>
            )}
          <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              disabled={isPending || !financialData}
            />
            <Button type="submit" size="icon" disabled={isPending || !input.trim() || !financialData}>
              <Send className="size-4" />
              <span className="sr-only">ارسال</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </main>
  );
}
