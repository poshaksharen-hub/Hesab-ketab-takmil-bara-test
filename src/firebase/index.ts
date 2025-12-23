// This file is intentionally left blank. 
// The correct Firebase initialization and provider logic is handled 
// in client-provider.tsx and provider.tsx.
// This file is now redundant and its old content was causing initialization issues.
// Exporting the necessary hooks and components from their new locations.

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-login';
