
'use client';
import React, { useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import type { ChatMessage } from '@/lib/types';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Skeleton } from '@/components/ui/skeleton';
import { USER_DETAILS } from '@/lib/constants';

const FAMILY_DATA_DOC = 'shared-data';

export function ChatInterface({ currentUser }: { currentUser: User }) {
  const firestore = useFirestore();

  const messagesCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`) : null),
    [firestore]
  );
  
  const messagesQuery = useMemoFirebase(
    () => (messagesCollectionRef ? query(messagesCollectionRef, orderBy('timestamp', 'asc')) : null),
    [messagesCollectionRef]
  );

  const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);
  
  // Effect to mark messages as read when the component is visible and messages are loaded.
  useEffect(() => {
    if (!firestore || !messages || messages.length === 0 || isLoading) return;

    const unreadMessages = messages.filter(
      (msg) => msg.readBy && !msg.readBy.includes(currentUser.uid) && msg.senderId !== currentUser.uid
    );

    if (unreadMessages.length > 0) {
      const batch = writeBatch(firestore);
      unreadMessages.forEach((message) => {
        const messageRef = doc(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`, message.id);
        // Ensure readBy exists before spreading
        const currentReadBy = message.readBy || [];
        batch.update(messageRef, {
          readBy: [...currentReadBy, currentUser.uid],
        });
      });

      batch.commit().catch(console.error);
    }
  }, [messages, firestore, currentUser.uid, isLoading]);
  
  const handleSendMessage = async (text: string) => {
    if (!messagesCollectionRef || text.trim() === '') return;
    
    const senderKey = currentUser.email?.startsWith('ali') ? 'ali' : 'fatemeh';
    const senderName = USER_DETAILS[senderKey].firstName;
    
    try {
        const newDocRef = await addDoc(messagesCollectionRef, {
            text,
            senderId: currentUser.uid,
            senderName: senderName,
            timestamp: serverTimestamp(),
            readBy: [currentUser.uid], // Sender has read it by default
        });
        // Now update the document with its own ID
        await writeBatch(firestore).update(newDocRef, { id: newDocRef.id }).commit();
    } catch (error) {
        console.error("Error sending message:", error);
    }
  };
  
  return (
    <div className="flex h-full flex-col">
      <div className="flex-grow overflow-y-auto p-4">
        {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-12 w-3/4 self-start rounded-lg" />
                <Skeleton className="h-16 w-1/2 self-end rounded-lg" />
                <Skeleton className="h-10 w-2/3 self-start rounded-lg" />
            </div>
        ) : (
             <MessageList messages={messages || []} currentUserId={currentUser.uid} />
        )}
      </div>
      <div className="border-t p-4 bg-background">
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}
