
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/firebase';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react';
import {
  getFinancialInsights,
  type FinancialInsightsInput,
  type FinancialInsightsOutput,
} from '@/ai/flows/get-financial-insights';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageInput } from '@/components/chat/message-input';
import { MessageList } from '@/components/chat/message-list';
import type { ChatMessage, OwnerId } from '@/lib/types';
import { USER_DETAILS } from '@/lib/constants';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useFirestore } from '@/firebase/provider';
import { collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import Link from 'next/link';

function InsightsPageSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="border rounded-lg h-[60vh] flex flex-col p-4 space-y-4">
        <div className="flex-grow space-y-4">
          <Skeleton className="h-12 w-3/4 self-start rounded-lg" />
          <Skeleton className="h-16 w-1/2 self-end rounded-lg" />
          <Skeleton className="h-10 w-2/3 self-start rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-grow" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { isLoading: isDataLoading, allData } = useDashboardData();
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  const isLoading = isUserLoading || isDataLoading;

  const handleSendMessage = async (text: string) => {
    if (!user) return;

    setIsGenerating(true);
    
    const senderName = user.email?.startsWith('ali') ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName;
    
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      senderId: user.uid,
      senderName: senderName,
      text: text,
      timestamp: new Date(),
      type: 'user',
      readBy: [user.uid],
    };

    setChatHistory(prev => [...prev, userMessage]);

    const financialData = prepareFinancialData();
    if (!financialData) {
      const errorMessage: ChatMessage = {
        id: `temp-error-${Date.now()}`,
        senderId: 'system',
        senderName: 'سیستم',
        text: 'متاسفانه به دلیل عدم وجود داده‌های مالی، امکان تحلیل وجود ندارد.',
        timestamp: new Date(),
        type: 'user', // Treat as user message to display correctly
        readBy: [],
      };
      setChatHistory(prev => [...prev, errorMessage]);
      setIsGenerating(false);
      return;
    }

    // Convert full ChatMessage[] to the simplified history for the AI
    const historyForAI = [...chatHistory, userMessage].map(msg => ({
        role: msg.senderId === 'system' ? 'model' : ('user' as 'user' | 'model'),
        parts: [{ text: msg.text }]
    }));


    try {
        const insights = await getFinancialInsights({ ...financialData, chatHistory: historyForAI });

        if (insights?.summary) {
            const aiMessage: ChatMessage = {
                id: `temp-ai-${Date.now()}`,
                senderId: 'system',
                senderName: 'تحلیلگر هوشمند',
                text: insights.summary,
                timestamp: new Date(),
                type: 'user', // Treat as user message for display
                readBy: [],
            };
            setChatHistory(prev => [...prev, aiMessage]);
        }
    } catch (error: any) {
        const errorMessage: ChatMessage = {
            id: `temp-error-${Date.now()}`,
            senderId: 'system',
            senderName: 'سیستم',
            text: `خطا در دریافت تحلیل: ${error.message}`,
            timestamp: new Date(),
            type: 'user',
            readBy: [],
        };
        setChatHistory(prev => [...prev, errorMessage]);
    } finally {
        setIsGenerating(false);
    }
  };


  const prepareFinancialData = (): Omit<FinancialInsightsInput, 'chatHistory'> | null => {
    if (!user || !allData || !allData.incomes) return null;

    const currentUserName = user.email?.startsWith('ali') ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName;
    const { incomes, expenses, bankAccounts, checks, loans, previousDebts, goals, categories, payees } = allData;

    const getOwnerName = (ownerId: OwnerId | 'shared_account') => {
        if (ownerId === 'shared' || ownerId === 'shared_account') return 'مشترک';
        return USER_DETAILS[ownerId as 'ali' | 'fatemeh']?.firstName || 'ناشناس';
    };

    return {
      currentUserName,
      incomes: incomes.map(i => ({ ...i, bankAccountName: bankAccounts.find(b => b.id === i.bankAccountId)?.bankName || 'N/A' })),
      expenses: expenses.map(e => ({
        ...e,
        bankAccountName: bankAccounts.find(b => b.id === e.bankAccountId)?.bankName || 'N/A',
        categoryName: categories.find(c => c.id === e.categoryId)?.name || 'N/A',
        payeeName: payees.find(p => p.id === e.payeeId)?.name,
        expenseFor: getOwnerName(e.expenseFor),
      })),
      bankAccounts: bankAccounts.map(b => ({ bankName: b.bankName, balance: b.balance, ownerId: getOwnerName(b.ownerId) })),
      checks: checks.filter(c => c.status === 'pending').map(c => ({...c, payeeName: payees.find(p => p.id === c.payeeId)?.name || 'N/A', bankAccountName: bankAccounts.find(b => b.id === c.bankAccountId)?.bankName || 'N/A'})),
      loans: loans.filter(l => l.remainingAmount > 0).map(l => ({ ...l, payeeName: payees.find(p => p.id === l.payeeId)?.name || 'N/A' })),
      previousDebts: previousDebts.filter(d => d.remainingAmount > 0).map(d => ({ ...d, payeeName: payees.find(p => p.id === d.payeeId)?.name || 'N/A' })),
      financialGoals: goals,
    };
  };

  if (isLoading) {
    return <InsightsPageSkeleton />;
  }

  return (
    <main className="flex h-[calc(100vh_-_5rem)] flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
            <Link href="/" passHref>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <ArrowRight className="h-5 w-5" />
                </Button>
            </Link>
            <h1 className="font-headline text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            تحلیلگر هوشمند مالی
            </h1>
        </div>
      </div>
       <div className="flex-grow overflow-y-auto p-4">
            <MessageList messages={chatHistory} currentUserId={user?.uid || ''} onReply={() => {}} />
            {isGenerating && (
                <div className="flex items-center gap-2 text-muted-foreground p-4">
                    <Wand2 className="h-5 w-5 animate-pulse" />
                    <p>در حال تحلیل و آماده‌سازی پاسخ...</p>
                </div>
            )}
            {chatHistory.length === 0 && !isGenerating && (
                <Card className="text-center">
                    <CardHeader>
                        <CardTitle>از کجا شروع کنیم؟</CardTitle>
                        <CardDescription>از تحلیلگر هوشمند چه سوالی دارید؟</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" onClick={() => handleSendMessage('یک تحلیل کلی از وضعیت مالی ما ارائه بده.')}>
                            یک تحلیل کلی به من بده
                        </Button>
                         <Button variant="outline" onClick={() => handleSendMessage('بزرگترین هزینه‌های ما در چه دسته‌بندی‌هایی بوده است؟')}>
                            بزرگترین هزینه‌های ما چه بوده؟
                        </Button>
                         <Button variant="outline" onClick={() => handleSendMessage('چطور می‌توانیم سریع‌تر به اهداف مالی خود برسیم؟')}>
                            چطور سریعتر به اهدافمان برسیم؟
                        </Button>
                    </CardContent>
                </Card>
            )}
       </div>
      <div className="border-t p-4 bg-muted/40">
        <MessageInput onSendMessage={handleSendMessage} replyingTo={null} onCancelReply={() => {}} />
      </div>
    </main>
  );
}
