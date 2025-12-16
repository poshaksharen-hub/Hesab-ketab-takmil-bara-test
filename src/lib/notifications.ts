
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
        
        // Step 1: Create the document with addDoc to get a new ID
        const newDocRef = await addDoc(chatMessagesRef, dataToSend);
        
        // Step 2: Update the newly created document with its own ID
        await updateDoc(newDocRef, { id: newDocRef.id });

    } catch (error) {
        console.error("Error sending system notification:", error);
        // We throw the error here to make it visible in server logs if something goes wrong.
        throw new Error(`Failed to send system notification. Reason: ${error instanceof Error ? error.message : String(error)}`);
    }
}
