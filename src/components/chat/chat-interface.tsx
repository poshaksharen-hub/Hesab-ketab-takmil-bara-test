
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

const FAMILY_DATA_DOC = 'shared-data';

export function ChatInterface({ currentUser }: { currentUser: User }) {
  const firestore = useFirestore();
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const messagesCollectionRef = useMemo(
    () => (firestore ? collection(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`) : null),
    [firestore]
  );

  const messagesQuery = useMemo(
    () => (messagesCollectionRef ? query(messagesCollectionRef, orderBy('timestamp', 'asc')) : null),
    [messagesCollectionRef]
  );
  
  const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users') : null), [firestore]);

  const { data: messages, isLoading: isLoadingMessages } = useCollection<ChatMessage>(messagesQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  const allUsers = users ? users : [USER_DETAILS.ali, USER_DETAILS.fatemeh];


  useEffect(() => {
    if (!firestore || !messages || messages.length === 0 || isLoadingMessages || !currentUser) return;

    const otherUser = allUsers.find(u => u.id !== currentUser.uid);
    if (!otherUser) return;

    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== currentUser.uid && (!msg.readBy || !msg.readBy.includes(currentUser.uid))
    );

    if (unreadMessages.length > 0) {
      const batch = writeBatch(firestore);
      unreadMessages.forEach((message) => {
        if (message.id) { // Ensure message has an ID before trying to update
          const messageRef = doc(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`, message.id);
          const currentReadBy = message.readBy || [];
          batch.update(messageRef, {
            readBy: [...currentReadBy, currentUser.uid],
          });
        }
      });

      batch.commit().catch(console.error);
    }
  }, [messages, firestore, currentUser, isLoadingMessages, allUsers]);

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
    
    const dataToSend = {
      ...newMessage,
      timestamp: serverTimestamp(),
    }

    addDocumentNonBlocking(messagesCollectionRef, dataToSend, (id) => {
        updateDoc(doc(messagesCollectionRef, id), { id });
        setReplyingToMessage(null);
    });
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-grow overflow-y-auto p-4">
        {(isLoadingMessages || isLoadingUsers) ? (
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
