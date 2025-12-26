
'use client';

// This file is temporarily unused during the Supabase migration.
// The notification logic will be re-implemented using Supabase Functions (Edge Functions)
// and database triggers for a more robust and scalable system.

import type { TransactionDetails } from './types';

/**
 * Sends a system-generated notification to the family chat.
 * These messages announce significant events, like new transactions.
 *
 * @param firestore - The Firestore database instance. (Currently unused)
 * @param actorUserId - The ID of the user who initiated the event. (Currently unused)
 * @param details - An object containing the specific details of the transaction to be displayed. (Currently unused)
 */
export async function sendSystemNotification(
    firestore: any, // Allow 'any' during transition
    actorUserId: string,
    details: TransactionDetails,
) {
    console.log("System notification prepared, but sending is disabled during Supabase migration.", { actorUserId, details });
    // The original logic to write to Firestore is commented out.
    // This will be replaced by a call to a Supabase Edge Function in the future.
    return;
}
