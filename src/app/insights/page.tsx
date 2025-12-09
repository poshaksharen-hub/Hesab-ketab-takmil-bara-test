
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, User, Bot, ArrowLeft } from 'lucide-react';
import { prepareFinancialInsightsInput } from './actions';
import { generateFinancialInsights } from '@/ai/flows/generate-financial-insights';
import type { FinancialInsightsInput, ChatHistory } from '@/ai/flows/generate-financial-insights';
import { USER_DETAILS } from '@/lib/constants';
import Markdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function InsightsPageSkeleton() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="border rounded-lg p-4 space-y-4">
                    <Skeleton className="h-16 w-3/4 self-start rounded-lg" />
                    <Skeleton className="h-20 w-1/2 self-end rounded-lg bg-primary/10" />
                    <Skeleton className="h-12 w-2/3 self-start rounded-lg" />
                </div>
            </div>
            <div className="p-4 border-t">
                <Skeleton className="h-24 w-full" />
                 <Skeleton className="h-10 w-32 mt-2" />
            </div>
        </div>
    );
}

type Message = {
    role: 'user' | 'model';
    content: string;
};

export default function InsightsPage() {
    const { user, isUserLoading } = useUser();
    const { allData, isLoading: isDashboardLoading } = useDashboardData();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isThinking || !user) return;

        const userMessage: Message = { role: 'user', content: input };
        const currentInput = input;
        
        const newMessages = [...messages, userMessage];

        setMessages([...newMessages, { role: 'model', content: '...' }]);
        setInput('');
        setIsThinking(true);

        try {
            const currentUserName = user.email?.startsWith('ali') ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName;
            // Correctly awaiting the async server action
            const financialDataInput = await prepareFinancialInsightsInput(allData, currentUserName);
            
            const history: ChatHistory[] = newMessages.map(m => ({
                role: m.role,
                content: m.content
            }));
            
            const insightsInput: FinancialInsightsInput = {
                ...financialDataInput,
                history, 
                latestUserQuestion: currentInput,
            };

            const result = await generateFinancialInsights(insightsInput);

            const modelMessage: Message = { role: 'model', content: result.summary };
            
            setMessages(prev => {
                const updatedMessages = [...prev];
                updatedMessages[updatedMessages.length - 1] = modelMessage;
                return updatedMessages;
            });

        } catch (error: any) {
            const errorMessageContent = error.message || 'یک خطای ناشناخته رخ داد.';
            const finalErrorMessage = `متاسفانه خطایی رخ داد: ${errorMessageContent}`;

            const errorMessage: Message = { role: 'model', content: finalErrorMessage };
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = errorMessage;
                return newMessages;
            });
        } finally {
            setIsThinking(false);
        }
    };
    
    if (isUserLoading || isDashboardLoading) {
        return <InsightsPageSkeleton />;
    }

    const currentUserName = user?.email?.startsWith('ali') ? USER_DETAILS.ali.firstName : USER_DETAILS.fatemeh.firstName;


  return (
    <main className="flex flex-col h-[calc(100vh_-_5rem)]">
        <div className="p-4 border-b flex justify-between items-center">
            <div>
                <h1 className="font-headline text-2xl font-bold flex items-center gap-2"><Sparkles className="text-primary"/> تحلیل هوشمند مالی</h1>
                <p className="text-muted-foreground text-sm mt-1">از دستیار هوشمند خود در مورد وضعیت مالی‌تان سوال بپرسید.</p>
            </div>
            <Link href="/" passHref>
                <Button variant="outline"><ArrowLeft className="ml-2 h-4 w-4" /> بازگشت به داشبورد</Button>
            </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 && (
                 <div className="text-center p-8 rounded-lg bg-muted/50">
                    <Sparkles className="mx-auto h-12 w-12 text-primary" />
                    <h2 className="mt-4 text-xl font-bold">سلام {currentUserName}، چطور می‌توانم کمکتان کنم؟</h2>
                    <p className="mt-2 text-muted-foreground">می‌توانید با پرسیدن سوالاتی مانند موارد زیر شروع کنید:</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setInput('یک تحلیل کلی از وضعیت مالی ما ارائه بده.')}>یک تحلیل کلی به من بده</Button>
                        <Button variant="outline" size="sm" onClick={() => setInput('بیشترین هزینه‌های ما در چه دسته‌بندی‌هایی بوده؟')}>بیشترین هزینه‌ها کجا بوده؟</Button>
                        <Button variant="outline" size="sm" onClick={() => setInput('چقدر تا رسیدن به هدف "خرید ماشین" باقی مانده؟')}>چقدر تا هدف خرید ماشین مانده؟</Button>
                    </div>
                </div>
            )}
            {messages.map((msg, index) => (
                <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                     {msg.role === 'model' && (
                        <Avatar className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center">
                            <AvatarFallback><Sparkles className="w-5 h-5"/></AvatarFallback>
                        </Avatar>
                    )}
                    <div className={cn(
                        "max-w-2xl rounded-lg px-4 py-3", 
                        msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                    )}>
                        {isThinking && msg.role === 'model' && msg.content === '...' ? (
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-0"></div>
                                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-200"></div>
                                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-400"></div>
                            </div>
                        ) : (
                            <article className="prose dark:prose-invert prose-sm max-w-none">
                                <Markdown>{msg.content}</Markdown>
                            </article>
                        )}
                    </div>
                     {msg.role === 'user' && (
                        <Avatar className="w-8 h-8">
                            <AvatarFallback>{currentUserName.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
            ))}
             <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t bg-background">
            <form onSubmit={handleSendMessage} className="relative">
                <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="سوال خود را در مورد وضعیت مالی‌تان بپرسید..."
                    className="pr-12"
                    rows={2}
                    disabled={isThinking}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                        }
                    }}
                />
                <Button type="submit" size="icon" className="absolute right-3 top-3" disabled={isThinking || !input.trim()}>
                    <Send className="w-4 h-4"/>
                </Button>
            </form>
        </div>
    </main>
  );
}
