
'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase';
import type { ChatMessage } from '@/lib/types';
import { useDashboardData } from './use-dashboard-data';

/**
 * A hook to get the count of unread chat messages for the current user.
 * It now uses the data fetched by `useDashboardData`.
 * @returns {object} An object containing the `unreadCount`.
 */
export function useUnreadMessages() {
  const { user, isUserLoading } = useUser();
  const { allData, isLoading: isDashboardLoading } = useDashboardData();
  
  const allMessages: ChatMessage[] = allData.chatMessages || [];

  const unreadCount = useMemo(() => {
    if (!allMessages || !user) {
      return 0;
    }
    // Filter messages that weren't sent by the current user AND
    // where the 'readBy' field either doesn't exist or doesn't include the user's UID.
    return allMessages.filter(msg => 
        msg.senderId !== user.id && msg.senderId !== 'system' &&
        (!msg.readBy || !msg.readBy.includes(user.id))
    ).length;
  }, [allMessages, user]);

  const isLoading = isUserLoading || isDashboardLoading;

  return { unreadCount: isLoading ? 0 : unreadCount };
}
