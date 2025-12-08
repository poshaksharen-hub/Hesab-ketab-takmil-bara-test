
'use client';
import React from 'react';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

function ChatPageSkeleton() {
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
    )
}

export default function ChatPage() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading || !user) {
        return <ChatPageSkeleton />;
    }

  return (
    <main className="flex h-[calc(100vh_-_3.5rem)] flex-col">
        <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/">
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="font-headline text-2xl font-bold tracking-tight flex items-center gap-2">
                    <MessageSquare className="h-6 w-6"/>
                    گفتگوی مشترک
                </h1>
            </div>
        </div>
        <ChatInterface currentUser={user} />
    </main>
  );
}
