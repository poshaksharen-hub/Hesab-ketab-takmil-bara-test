
'use client';

import React, { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, BrainCircuit, Send, User as UserIcon, Loader2, AlertTriangle, MessageSquarePlus } from 'lucide-react';
import { getFinancialInsightsAction, type FinancialInsightsInput, type ChatHistory, type FinancialInsightsOutput } from './actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { USER_DETAILS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function ChatBubble({ role, content }: { role: 'user' | 'model'; content: string }) {
    const isModel = role === 'model';
    return (
        <div className={cn("flex items-start gap-3", isModel ? "justify-start" : "justify-end")}>
            {isModel && (
                 <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback><BrainCircuit className="h-5 w-5"/></AvatarFallback>
                </Avatar>
            )}
             <div className={cn(
                "max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-md",
                isModel ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
             )}>
                <p className="whitespace-pre-wrap">{content}</p>
            </div>
             {!isModel && (
                 <Avatar className="h-8 w-8">
                    <AvatarFallback><UserIcon className="h-5 w-5"/></AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}


export default function InsightsPage() {
  const { user } = useUser();
  const { isLoading: isDashboardLoading, allData } = useDashboardData();
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [history]);
  
  const financialData = useMemo<FinancialInsightsInput | null>(() => {
    if (isDashboardLoading || !allData || !user) return null;

    const { incomes, expenses, bankAccounts, checks, loans, previousDebts, goals, payees } = allData;
    
    return {
      currentUserName: user.email?.startsWith('ali') ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName,
      incomes: incomes.map(i => ({
        description: i.description,
        amount: i.amount,
        date: i.date,
        bankAccountName: bankAccounts.find(b => b.id === i.bankAccountId)?.bankName || 'نامشخص',
        source: i.source,
      })),
      expenses: expenses.map(e => ({
        description: e.description,
        amount: e.amount,
        date: e.date,
        bankAccountName: bankAccounts.find(b => b.id === e.bankAccountId)?.bankName || 'نامشخص',
        categoryName: allData.categories.find(c => c.id === e.categoryId)?.name || 'نامشخص',
        payeeName: payees.find(p => p.id === e.payeeId)?.name,
        expenseFor: e.expenseFor,
      })),
      bankAccounts: bankAccounts.map(b => ({
        bankName: b.bankName,
        balance: b.balance,
        ownerId: b.ownerId,
      })),
      checks: checks.filter(c => c.status === 'pending').map(c => ({
        description: c.description,
        amount: c.amount,
        dueDate: c.dueDate,
        payeeName: payees.find(p => p.id === c.payeeId)?.name || 'نامشخص',
        bankAccountName: bankAccounts.find(b => b.id === c.bankAccountId)?.bankName || 'نامشخص',
      })),
      loans: loans.filter(l => l.remainingAmount > 0).map(l => ({
        title: l.title,
        remainingAmount: l.remainingAmount,
        installmentAmount: l.installmentAmount,
        payeeName: payees.find(p => p.id === l.payeeId)?.name || 'نامشخص',
      })),
      previousDebts: previousDebts.filter(d => d.remainingAmount > 0).map(d => ({
        description: d.description,
        remainingAmount: d.remainingAmount,
        payeeName: payees.find(p => p.id === d.payeeId)?.name || 'نامشخص',
      })),
      financialGoals: goals.map(g => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
        priority: g.priority,
        isAchieved: g.isAchieved,
      })),
    };
  }, [isDashboardLoading, allData, user]);

  const handleSubmit = () => {
    if (!currentQuestion.trim() || isPending) return;

    const newHistory: ChatHistory[] = [...history, { role: 'user', parts: [{ text: currentQuestion.trim() }] }];
    setHistory(newHistory);
    setCurrentQuestion('');
    setError(null);
    
    startTransition(async () => {
      const result = await getFinancialInsightsAction(financialData, newHistory);
      if (result.success && result.data) {
        setHistory(prev => [...prev, { role: 'model', parts: [{ text: result.data!.summary }] }]);
      } else {
        setError(result.error || 'یک خطای ناشناخته رخ داد.');
        setHistory(prev => prev.slice(0, -1)); // Revert user message on error
      }
    });
  };

  if (isDashboardLoading) {
      return (
        <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <div className="border rounded-lg mt-4 h-[60vh]">
                <div className="p-4 space-y-4">
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-12 w-2/4 self-end" />
                </div>
            </div>
        </main>
      )
  }

  return (
    <main className="flex flex-col h-[calc(100vh-80px)] p-4 pt-6 md:p-8">
        <div className="space-y-1 mb-4">
            <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-primary" />
                تحلیل هوشمند مالی
            </h1>
            <p className="text-muted-foreground">
                از مشاور مالی هوشمند خود سوال بپرسید یا یک تحلیل کلی درخواست کنید.
            </p>
        </div>
      
       <div className="flex-1 flex flex-col p-4 gap-4 border rounded-lg shadow-sm">
             <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                    <ChatBubble 
                        role="model" 
                        content="سلام! من مشاور مالی هوشمند شما هستم. چطور می‌توانم در تحلیل وضعیت مالی به شما کمک کنم؟ می‌توانید با پرسیدن «یک تحلیل کلی به من بده» شروع کنید."
                    />
                    {history.map((item, index) => <ChatBubble key={index} role={item.role} content={item.parts[0].text} />)}
                    {isPending && (
                        <div className="flex items-start gap-3 justify-start">
                            <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                <AvatarFallback><BrainCircuit className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                            <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-md bg-muted text-foreground">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>در حال تحلیل...</span>
                                </div>
                            </div>
                        </div>
                    )}
                     {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>خطا در پردازش</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </ScrollArea>
            <div className="relative mt-4">
                <Textarea
                    value={currentQuestion}
                    onChange={e => setCurrentQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
                    placeholder="سوال خود را اینجا تایپ کنید..."
                    className="pr-12"
                    disabled={isPending}
                />
                <Button
                    type="submit"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={handleSubmit}
                    disabled={isPending || !currentQuestion.trim()}
                >
                   <Send className="h-4 w-4" />
                </Button>
            </div>
       </div>

    </main>
  );
}
