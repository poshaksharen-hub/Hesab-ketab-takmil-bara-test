
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useFirestore, useCollection } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  writeBatch,
  doc,
  updateDoc,
} from 'firebase/firestore';
import type { ChatMessage, UserProfile } from '@/lib/types';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Skeleton } from '@/components/ui/skeleton';
import { USER_DETAILS } from '@/lib/constants';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useDashboardData } from '@/hooks/use-dashboard-data';

const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

export function ChatInterface({ currentUser }: { currentUser: User }) {
  const { isLoading: isDataLoading, allData } = useDashboardData();
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const { firestore, users: allUsers } = allData;
  const messagesQuery = useMemo(
    () => (firestore ? query(collection(firestore, FAMILY_DATA_DOC_PATH, 'chatMessages'), orderBy('timestamp', 'asc')) : null),
    [firestore]
  );
  const { data: messages, isLoading: isLoadingMessages } = useCollection<ChatMessage>(messagesQuery);
  const isLoading = isDataLoading || isLoadingMessages;

  useEffect(() => {
    if (!firestore || !messages || messages.length === 0 || isLoadingMessages || !currentUser) return;

    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== currentUser.uid && (!msg.readBy || !msg.readBy.includes(currentUser.uid))
    );

    if (unreadMessages.length > 0) {
      const batch = writeBatch(firestore);
      unreadMessages.forEach((message) => {
        if (message.id) { // Ensure message has an ID before trying to update
          const messageRef = doc(firestore, FAMILY_DATA_DOC_PATH, 'chatMessages', message.id);
          const currentReadBy = message.readBy || [];
          batch.update(messageRef, {
            readBy: [...currentReadBy, currentUser.uid],
          });
        }
      });

      batch.commit().catch(console.error);
    }
  }, [messages, firestore, currentUser, isLoadingMessages]);

  const handleSendMessage = async (text: string) => {
    if (!firestore || text.trim() === '') return;
    
    const messagesCollectionRef = collection(firestore, FAMILY_DATA_DOC_PATH, 'chatMessages');

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
      ...newMessage,
      timestamp: serverTimestamp(),
    };

    addDocumentNonBlocking(messagesCollectionRef, dataToSend, (id) => {
        updateDoc(doc(messagesCollectionRef, id), { id });
        setReplyingToMessage(null);
    });
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
