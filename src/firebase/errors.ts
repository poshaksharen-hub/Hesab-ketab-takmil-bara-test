'use client';

/**
 * A simplified, client-safe custom error for Firestore permission issues.
 * This error is intended to be thrown directly when a Firestore operation fails,
 * to be caught by the nearest Next.js error boundary.
 */
export class FirestorePermissionError extends Error {
  public path: string;
  public operation: string;

  constructor(context: { path: string; operation: string; }) {
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
