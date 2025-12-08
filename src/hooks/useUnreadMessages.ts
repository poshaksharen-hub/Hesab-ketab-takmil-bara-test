
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
  const unreadMessagesQuery = useMemoFirebase(() => {
    if (!firestore || !user) {
      return null;
    }
    return query(
      collection(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`),
      where('readBy', 'not-in', [[user.uid]])
    );
  }, [firestore, user]);

  // Use the useCollection hook to get real-time updates on unread messages.
  const { data: unreadMessages, isLoading: isLoadingMessages } = useCollection<ChatMessage>(unreadMessagesQuery);

  // Calculate the count, ensuring we don't count messages sent by the current user.
  const unreadCount = useMemo(() => {
    if (!unreadMessages || !user) {
      return 0;
    }
    return unreadMessages.filter(msg => msg.senderId !== user.uid).length;
  }, [unreadMessages, user]);

  const isLoading = isUserLoading || isLoadingMessages;

  return { unreadCount: isLoading ? 0 : unreadCount };
}
