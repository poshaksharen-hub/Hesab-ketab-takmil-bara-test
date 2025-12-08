
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ChatMessage } from '@/lib/types';

const FAMILY_DATA_DOC = 'shared-data';

/**
 * A hook to get the count of unread chat messages for the current user.
 * @returns {object} An object containing the `unreadCount`.
 */
export function useUnreadMessages() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const messagesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user) {
      return null;
    }
    return collection(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`);
  }, [firestore, user]);

  const { data: allMessages, isLoading: isLoadingMessages } = useCollection<ChatMessage>(messagesCollectionRef);

  const unreadCount = useMemo(() => {
    if (!allMessages || !user) {
      return 0;
    }
    // Filter messages that weren't sent by the current user AND
    // where the 'readBy' field either doesn't exist or doesn't include the user's UID.
    return allMessages.filter(msg => 
        msg.senderId !== user.uid && 
        (!msg.readBy || !msg.readBy.includes(user.uid))
    ).length;
  }, [allMessages, user]);

  const isLoading = isUserLoading || isLoadingMessages;

  return { unreadCount: isLoading ? 0 : unreadCount };
}
