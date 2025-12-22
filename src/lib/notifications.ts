
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
 * @param details - An object containing the specific details of the transaction to be displayed.
 */
export async function sendSystemNotification(
    firestore: Firestore,
    actorUserId: string,
    details: TransactionDetails,
) {
    if (!firestore) {
        console.error("Firestore instance is not available for sendSystemNotification.");
        return;
    }

    try {
        const chatMessagesRef = collection(firestore, CHAT_MESSAGES_COLLECTION_PATH);
        const newDocRef = doc(chatMessagesRef); 

        // Sanitize the details object to remove any undefined or null fields before sending to Firestore
        const sanitizedDetails = { ...details };
        Object.keys(sanitizedDetails).forEach(key => {
            const K = key as keyof TransactionDetails;
            if (sanitizedDetails[K] === undefined || sanitizedDetails[K] === null) {
                delete sanitizedDetails[K];
            }
             if (K === 'properties' && Array.isArray(sanitizedDetails.properties)) {
                sanitizedDetails.properties = sanitizedDetails.properties.filter(p => p.value !== undefined && p.value !== null);
                if (sanitizedDetails.properties.length === 0) {
                    delete sanitizedDetails.properties;
                }
            }
        });

        const dataToSend = {
            id: newDocRef.id,
            senderId: 'system', 
            senderName: 'دستیار هوشمند مالی',
            text: sanitizedDetails.title,
            type: 'system' as const,
            transactionDetails: sanitizedDetails,
            readBy: [actorUserId], 
            timestamp: serverTimestamp(),
        };
        
        await setDoc(newDocRef, dataToSend);

    } catch (error) {
        console.error("Fatal error in sendSystemNotification:", error);
    }
}
