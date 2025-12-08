
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { ChatMessage } from '@/lib/types';

const FAMILY_DATA_DOC = 'shared-data';

/**
 * A hook to get the count of unread chat messages for the current user.
 * @returns {object} An object containing the `unreadCount`.
 */
export function useUnreadMessages() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Memoize the query for unread messages.
  // The query fetches messages where the current user's UID is NOT in the 'readBy' array.
  const messagesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user) {
      return null;
    }
    return collection(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`);
  }, [firestore, user]);

  // Use the useCollection hook to get real-time updates on all messages.
  // We filter client-side because Firestore's 'not-in' query has limitations
  // and checking for array non-membership is better done on the client.
  const { data: allMessages, isLoading: isLoadingMessages } = useCollection<ChatMessage>(messagesCollectionRef);

  // Calculate the count, ensuring we don't count messages sent by the current user.
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
