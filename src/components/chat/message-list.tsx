
'use client';

import React, { useRef, useEffect } from 'react';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { USER_DETAILS } from '@/lib/constants';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

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
              <p className={cn(
                  "mt-2 text-xs",
                  isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {formatDate(message.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={endOfMessagesRef} />
    </div>
  );
}
