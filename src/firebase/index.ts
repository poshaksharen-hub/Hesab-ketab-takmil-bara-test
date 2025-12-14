
'use client';

// This file now acts as a simple barrel file for exporting hooks.
// The initialization logic has been moved to FirebaseClientProvider
// to ensure it runs only once on the client and that a single instance
// of Firebase services is used throughout the app.

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-login';
