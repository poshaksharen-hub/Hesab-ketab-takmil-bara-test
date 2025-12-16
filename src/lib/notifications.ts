
'use server';

import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { TransactionDetails } from './types';

const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

export async function sendSystemNotification(
    firestore: Firestore,
    actorUserId: string,
    details: TransactionDetails,
    actorFirstName?: string
) {
    if (!firestore) return;

    try {
        const chatMessagesRef = collection(firestore, FAMILY_DATA_DOC_PATH, 'chatMessages');
        
        const notificationText = `${actorFirstName || 'کاربر'} یک تراکنش جدید ثبت کرد: ${details.title}`;

        const dataToSend = {
            senderId: 'system',
            senderName: 'دستیار هوشمند',
            text: notificationText,
            type: 'system' as const,
            transactionDetails: details,
            readBy: [actorUserId],
            timestamp: serverTimestamp(),
        };
        
        const newDocRef = doc(chatMessagesRef);
        
        await updateDoc(newDocRef, { ...dataToSend, id: newDocRef.id });

    } catch (error) {
        console.error("Error sending system notification:", error);
        throw new Error(`Failed to send system notification. Reason: ${error instanceof Error ? error.message : String(error)}`);
    }
}
