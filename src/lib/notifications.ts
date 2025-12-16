
'use server';

import { collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { TransactionDetails } from './types';

const FAMILY_DATA_DOC_PATH = 'family-data/shared-data';

export async function sendSystemNotification(
    firestore: Firestore,
    actorUserId: string,
    details: TransactionDetails,
    actorFirstName?: string,
) {
    if (!firestore) return;

    try {
        const chatMessagesRef = collection(firestore, FAMILY_DATA_DOC_PATH, 'chatMessages');
        
        const notificationText = `${actorFirstName || 'کاربر'} یک تراکنش جدید ثبت کرد: ${details.title}`;

        const newDocRef = await addDoc(chatMessagesRef, {
            senderId: 'system',
            senderName: 'دستیار هوشمند',
            text: notificationText,
            type: 'system',
            transactionDetails: details, // Ensure the full details object is saved
            readBy: [actorUserId], // The actor has "read" it by creating it
            timestamp: serverTimestamp(),
        });
        
        await updateDoc(newDocRef, { id: newDocRef.id });

    } catch (error) {
        console.error("Error sending system notification:", error);
    }
}
