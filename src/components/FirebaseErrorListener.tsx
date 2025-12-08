'use client';

import { useState, useEffect } from 'react';

/**
 * An invisible component that previously listened for global errors.
 * Its role is being simplified or removed to prevent build issues.
 * For now, it will do nothing.
 */
export function FirebaseErrorListener() {
  // The logic has been removed to solve the 'async_hooks' build error.
  // Error handling will now be managed by Next.js's built-in error boundaries
  // (error.tsx and global-error.tsx). When an error is thrown by a component,
  // the nearest error boundary will catch it and display a fallback UI.
  // This approach is more idiomatic for Next.js applications.
  return null;
}
