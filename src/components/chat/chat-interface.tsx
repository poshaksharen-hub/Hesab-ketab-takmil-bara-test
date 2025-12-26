
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useFirestore } from '@/firebase';
import type { ChatMessage, UserProfile } from '@/lib/types';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Skeleton } from '@/components/ui/skeleton';
import { USER_DETAILS } from '@/lib/constants';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { supabase } from '@/lib/supabase-client';

const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

export function ChatInterface({ currentUser, allData }: { currentUser: User, allData: any }) {
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const { firestore, users: allUsers, chatMessages: messages } = allData;
  const isLoading = !messages;

  useEffect(() => {
    if (isLoading || !messages || messages.length === 0 || !currentUser) return;

    const unreadMessages = messages.filter(
      (msg: ChatMessage) => msg.senderId !== currentUser.uid && (!msg.readBy || !msg.readBy.includes(currentUser.uid))
    );

    if (unreadMessages.length > 0) {
      const updates = unreadMessages.map(message => ({
        id: message.id,
        read_by: [...(message.readBy || []), currentUser.uid]
      }));

      supabase.from('chat_messages').upsert(updates).then(({ error }) => {
        if (error) console.error("Error marking messages as read:", error);
      });
    }
  }, [messages, currentUser, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (text.trim() === '') return;
    
    const senderKey = currentUser.email?.startsWith('ali') ? 'ali' : 'fatemeh';
    const senderName = USER_DETAILS[senderKey].firstName;

    const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      text,
      senderId: currentUser.uid,
      senderName: senderName,
      type: 'user',
      readBy: [currentUser.uid],
    };

    if (replyingToMessage) {
      newMessage.replyTo = {
        messageId: replyingToMessage.id,
        text: replyingToMessage.text,
        senderName: replyingToMessage.senderName,
      };
    }
    
    const dataToSend = {
      sender_id: newMessage.senderId,
      sender_name: newMessage.senderName,
      text: newMessage.text,
      type: newMessage.type,
      read_by: newMessage.readBy,
      reply_to: newMessage.replyTo,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from('chat_messages').insert([dataToSend]);

    if (error) {
      console.error("Error sending message:", error);
      // Optionally show a toast to the user
    } else {
      setReplyingToMessage(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-grow overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4 self-start rounded-lg" />
            <Skeleton className="h-16 w-1/2 self-end rounded-lg" />
            <Skeleton className="h-10 w-2/3 self-start rounded-lg" />
          </div>
        ) : (
          <MessageList
            messages={messages || []}
            currentUserId={currentUser.uid}
            onReply={setReplyingToMessage}
            allUsers={allUsers}
          />
        )}
      </div>
      <div className="border-t p-4 bg-muted/40">
        <MessageInput
          onSendMessage={handleSendMessage}
          replyingTo={replyingToMessage}
          onCancelReply={() => setReplyingToMessage(null)}
        />
      </div>
    </div>
  );
}
