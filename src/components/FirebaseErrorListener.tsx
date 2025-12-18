'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

/**
 * An invisible component that listens for global 'permission-error' events
 * and re-throws them to be caught by the nearest Next.js error boundary.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: Error) => {
      // Create a new, plain error object to break any potential circular references
      // in the original error object that might be causing issues with Next.js's dev overlay.
      // This preserves the useful message while ensuring the overlay doesn't crash.
      throw new Error(error.message);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}
