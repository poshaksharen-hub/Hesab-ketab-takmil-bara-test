
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
import type { ChatMessage } from '@/lib/types';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Skeleton } from '@/components/ui/skeleton';
import { USER_DETAILS } from '@/lib/constants';

const FAMILY_DATA_DOC = 'shared-data';

export function ChatInterface({ currentUser }: { currentUser: User }) {
  const firestore = useFirestore();
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const messagesCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`) : null),
    [firestore]
  );

  const messagesQuery = useMemoFirebase(
    () => (messagesCollectionRef ? query(messagesCollectionRef, orderBy('timestamp', 'asc')) : null),
    [messagesCollectionRef]
  );

  const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);

  useEffect(() => {
    if (!firestore || !messages || messages.length === 0 || isLoading || !currentUser) return;

    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== currentUser.uid && (!msg.readBy || !msg.readBy.includes(currentUser.uid))
    );

    if (unreadMessages.length > 0) {
      const batch = writeBatch(firestore);
      unreadMessages.forEach((message) => {
        const messageRef = doc(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`, message.id);
        const currentReadBy = message.readBy || [];
        batch.update(messageRef, {
          readBy: [...currentReadBy, currentUser.uid],
        });
      });

      batch.commit().catch(console.error);
    }
  }, [messages, firestore, currentUser, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!messagesCollectionRef || text.trim() === '') return;

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

    try {
      const newDocRef = await addDoc(messagesCollectionRef, {
        ...newMessage,
        timestamp: serverTimestamp(),
      });
      // This is the bug fix part. It ensures the message 'id' field is populated.
      await updateDoc(newDocRef, { id: newDocRef.id });
      setReplyingToMessage(null);
    } catch (error) {
      console.error("Error sending message:", error);
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
