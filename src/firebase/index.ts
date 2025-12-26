
'use client';

// This file acts as a central barrel file for exporting Firebase-related hooks and components.
// It ensures that other parts of the application can import from a single, consistent path (`@/firebase`).
// This file should NOT contain any initialization logic itself.

export * from './provider';
// export * from './client-provider'; // This is now obsolete as we move to Supabase
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-login';
