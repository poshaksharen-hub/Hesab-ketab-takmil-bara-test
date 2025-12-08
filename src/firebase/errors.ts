'use client';

/**
 * A simplified, client-safe custom error for Firestore permission issues.
 * This error no longer attempts to build a complex, rule-compliant request object
 * to avoid pulling in server-side dependencies like `getAuth` into the client bundle.
 */
export class FirestorePermissionError extends Error {
  public path: string;
  public operation: string;

  constructor(context: { path: string; operation: string; requestResourceData?: any }) {
    const message = `Firestore Permission Denied: Operation '${context.operation}' on path '${context.path}' failed.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.path = context.path;
    this.operation = context.operation;
    
    // Ensure the stack trace is captured correctly
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }
}
