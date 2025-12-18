'use client';

import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { TransactionDetails } from './types';

const CHAT_MESSAGES_COLLECTION_PATH = 'chat/family-chat/messages';

/**
 * Sends a system-generated notification to the family chat.
 * These messages announce significant events, like new transactions.
 *
 * @param firestore - The Firestore database instance.
 * @param actorUserId - The ID of the user who initiated the event.
 * @param participantIds - An array of all user IDs who should be part of the message's participants list.
 * @param details - An object containing the specific details of the transaction to be displayed.
 */
export async function sendSystemNotification(
    firestore: Firestore,
    actorUserId: string,
    participantIds: string[],
    details: TransactionDetails,
) {
    if (!firestore) {
        console.error("Firestore instance is not available for sendSystemNotification.");
        return;
    }

    try {
        const chatMessagesRef = collection(firestore, CHAT_MESSAGES_COLLECTION_PATH);
        const newDocRef = doc(chatMessagesRef); 

        const notificationText = details.title || `تراکنش جدید توسط ${details.registeredBy || 'کاربر'} ثبت شد.`;

        const dataToSend = {
            id: newDocRef.id,
            senderId: 'system', 
            senderName: 'دستیار هوشمند مالی',
            text: notificationText,
            type: 'system' as const,
            transactionDetails: {
                ...details,
                date: new Date(details.date).toISOString(),
            },
            participants: participantIds,
            readBy: [actorUserId], 
            timestamp: serverTimestamp(),
        };
        
        await setDoc(newDocRef, dataToSend);

    } catch (error) {
        console.error("Fatal error in sendSystemNotification:", error);
    }
}
