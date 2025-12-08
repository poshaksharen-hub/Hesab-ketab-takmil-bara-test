
'use server';

import { collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { TransactionDetails } from './types';
import { USER_DETAILS } from './constants';

const FAMILY_DATA_DOC = 'shared-data';

export async function sendSystemNotification(
    firestore: Firestore,
    actorUserId: string,
    details: TransactionDetails
) {
    if (!firestore) return;

    try {
        const actorName = Object.values(USER_DETAILS).find(u => u.id === actorUserId)?.firstName || 'کاربر';
        const chatMessagesRef = collection(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`);
        
        const notificationText = `${actorName} یک تراکنش جدید ثبت کرد: ${details.title}`;

        const newDocRef = await addDoc(chatMessagesRef, {
            senderId: 'system',
            senderName: 'دستیار هوشمند مشترکانه',
            text: notificationText,
            type: 'system',
            transactionDetails: details,
            readBy: [],
            timestamp: serverTimestamp(),
        });
        
        // Update the document with its own ID
        await updateDoc(newDocRef, { id: newDocRef.id });

    } catch (error) {
        console.error("Error sending system notification:", error);
        // Optionally, handle this error more gracefully
    }
}
