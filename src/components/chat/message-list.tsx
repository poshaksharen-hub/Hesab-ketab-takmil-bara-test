
'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import type { ChatMessage, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { USER_DETAILS } from '@/lib/constants';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Check, CheckCheck } from 'lucide-react';


interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const { allData } = useDashboardData();
  const { users } = allData;

  const otherUser = useMemo(() => {
    return users.find(u => u.id !== currentUserId);
  }, [users, currentUserId]);


  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate();
        return formatDistanceToNow(date, { addSuffix: true, locale: faIR });
    } catch(e) {
        return 'همین الان';
    }
  }

  const getReadStatusIcon = (message: ChatMessage) => {
    if (!otherUser) return <Check className="h-4 w-4" />;
    
    const isReadByOther = message.readBy?.includes(otherUser.id);
    
    if (isReadByOther) {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    }
    return <Check className="h-4 w-4" />;
  };
  
  if (messages.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">هنوز پیامی رد و بدل نشده است. اولین نفر باشید!</p>
        </div>
      )
  }

  return (
    <div className="space-y-6">
      {messages.map((message) => {
        const isCurrentUser = message.senderId === currentUserId;
        const senderKey = message.senderName === USER_DETAILS.ali.firstName ? 'ali' : 'fatemeh';
        const avatar = getPlaceholderImage(`${senderKey}-avatar`);

        return (
          <div
            key={message.id}
            className={cn('flex items-end gap-3', isCurrentUser ? 'flex-row-reverse' : 'flex-row')}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatar?.imageUrl} data-ai-hint={avatar?.imageHint} />
              <AvatarFallback>{message.senderName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'max-w-xs rounded-lg p-3 lg:max-w-md',
                isCurrentUser
                  ? 'rounded-br-none bg-primary text-primary-foreground'
                  : 'rounded-bl-none bg-muted'
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{message.text}</p>
              <div className={cn(
                  "mt-2 flex items-center gap-1 text-xs",
                  isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                <span>{formatDate(message.timestamp)}</span>
                {isCurrentUser && getReadStatusIcon(message)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endOfMessagesRef} />
    </div>
  );
}
