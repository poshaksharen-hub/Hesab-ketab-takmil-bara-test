'use client';

import { useState, useEffect } from 'react';
// The error emitter is removed to prevent dependency issues.
// We will rely on a different mechanism if needed, or allow Next.js error boundaries to catch errors.

/**
 * An invisible component that previously listened for global errors.
 * Its role is being simplified or removed to prevent build issues.
 * For now, it will do nothing.
 */
export function FirebaseErrorListener() {
  // The logic has been removed to solve the 'async_hooks' build error.
  // Error handling will now be managed by Next.js's built-in error boundaries
  // (error.tsx and global-error.tsx).
  return null;
}
