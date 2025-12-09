'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

/**
 * An invisible component that listens for global 'permission-error' events
 * and re-throws them to be caught by the nearest Next.js error boundary.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: any) => {
      // Re-throw the error to let the Next.js error boundary handle it.
      // This will display the error overlay in development.
      throw error;
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}
