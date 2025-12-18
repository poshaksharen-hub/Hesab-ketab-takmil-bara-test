
'use client';

import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { TransactionDetails } from './types';

const CHAT_MESSAGES_COLLECTION_PATH = 'family-data/shared-data/chatMessages';

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
    participantIds: string[] | TransactionDetails, // Can be old signature or new one
    details?: TransactionDetails
) {
    if (!firestore) {
        console.error("Firestore instance is not available for sendSystemNotification.");
        return;
    }

    // Handle overloaded function signature for backward compatibility
    let finalDetails: TransactionDetails;
    let finalParticipantIds: string[];

    if (details) { // New signature: (firestore, actorId, participantIds, details)
        finalDetails = details;
        finalParticipantIds = participantIds as string[];
    } else { // Old signature: (firestore, actorId, details, registeredBy)
        finalDetails = participantIds as TransactionDetails;
        finalParticipantIds = []; 
    }

    try {
        const chatMessagesRef = collection(firestore, CHAT_MESSAGES_COLLECTION_PATH);
        const newDocRef = doc(chatMessagesRef); 

        const notificationText = finalDetails.title || `تراکنش جدید توسط ${finalDetails.registeredBy || 'کاربر'} ثبت شد.`;
        
        // Sanitize the details object to remove any undefined fields before sending to Firestore
        const sanitizedDetails = { ...finalDetails };
        Object.keys(sanitizedDetails).forEach(key => {
            const K = key as keyof TransactionDetails;
            if (sanitizedDetails[K] === undefined) {
                delete sanitizedDetails[K];
            }
        });


        const dataToSend = {
            id: newDocRef.id,
            senderId: 'system', 
            senderName: 'دستیار هوشمند مالی',
            text: notificationText,
            type: 'system' as const,
            transactionDetails: {
                ...sanitizedDetails,
                date: new Date(finalDetails.date).toISOString(),
            },
            participants: finalParticipantIds,
            readBy: [actorUserId], 
            timestamp: serverTimestamp(),
        };
        
        await setDoc(newDocRef, dataToSend);

    } catch (error) {
        console.error("Fatal error in sendSystemNotification:", error);
    }
}
