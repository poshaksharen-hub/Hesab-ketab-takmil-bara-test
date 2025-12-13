
'use server';

import { collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { TransactionDetails } from './types';

const FAMILY_DATA_DOC = 'shared-data';

export async function sendSystemNotification(
    firestore: Firestore,
    actorUserId: string,
    details: Omit<TransactionDetails, 'registeredBy'>, // Remove registeredBy from here
    registeredBy: string // Add it as a separate parameter
) {
    if (!firestore) return;

    try {
        const notificationDetails: TransactionDetails = {
            ...details,
            registeredBy, // Use the provided parameter
        };
        
        const chatMessagesRef = collection(firestore, `family-data/${FAMILY_DATA_DOC}/chatMessages`);
        
        const notificationText = `${registeredBy} یک تراکنش جدید ثبت کرد: ${details.title}`;

        const newDocRef = await addDoc(chatMessagesRef, {
            senderId: 'system',
            senderName: 'دستیار هوشمند مشترکانه',
            text: notificationText,
            type: 'system',
            transactionDetails: notificationDetails,
            readBy: [actorUserId], // The actor has "read" it by creating it
            timestamp: serverTimestamp(),
        });
        
        // Update the document with its own ID
        await updateDoc(newDocRef, { id: newDocRef.id });

    } catch (error) {
        console.error("Error sending system notification:", error);
        // Optionally, handle this error more gracefully
    }
}
