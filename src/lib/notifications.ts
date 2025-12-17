
'use server';

import { collection, doc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { TransactionDetails } from './types';

const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

export async function sendSystemNotification(
    firestore: Firestore,
    actorUserId: string,
    participantIds: string[],
    details: TransactionDetails,
) {
    if (!firestore) return;

    try {
        const chatMessagesRef = collection(firestore, FAMILY_DATA_DOC_PATH, 'chatMessages');
        
        const notificationText = `${details.registeredBy || 'کاربر'} یک تراکنش جدید ثبت کرد: ${details.title}`;

        const newDocRef = doc(chatMessagesRef);

        const dataToSend = {
            id: newDocRef.id,
            senderId: 'system',
            senderName: 'دستیار هوشمند',
            text: notificationText,
            type: 'system' as const,
            transactionDetails: {
                ...details,
                date: new Date(details.date).toISOString(),
            },
            participants: participantIds, // All users who should see the message
            readBy: [actorUserId],      // Only the user who initiated the action
            timestamp: new Date().toISOString(),
        };
        
        await setDoc(newDocRef, dataToSend);

    } catch (error) {
        console.error("Error sending system notification:", error);
    }
}
