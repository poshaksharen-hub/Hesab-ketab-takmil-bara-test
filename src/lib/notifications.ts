
'use server';

import { collection, doc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { TransactionDetails } from './types';

const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

export async function sendSystemNotification(
    firestore: Firestore,
    actorUserId: string,
    details: TransactionDetails,
) {
    if (!firestore) return;

    try {
        const chatMessagesRef = collection(firestore, FAMILY_DATA_DOC_PATH, 'chatMessages');
        
        const notificationText = `${details.registeredBy || 'کاربر'} یک تراکنش جدید ثبت کرد: ${details.title}`;

        // Create a new document reference with an auto-generated ID
        const newDocRef = doc(chatMessagesRef);

        const dataToSend = {
            id: newDocRef.id, // Explicitly set the ID
            senderId: 'system',
            senderName: 'دستیار هوشمند',
            text: notificationText,
            type: 'system' as const,
            transactionDetails: details,
            readBy: [actorUserId],
            timestamp: new Date().toISOString(), // Use a simple ISO string for timestamp
        };
        
        // Use setDoc with the new reference
        await setDoc(newDocRef, dataToSend);

    } catch (error) {
        console.error("Error sending system notification:", error);
        // Avoid throwing an error here to not block the main flow, 
        // as the primary transaction has already succeeded.
        // Instead, we could log this to a more persistent monitoring service in a real app.
    }
}
