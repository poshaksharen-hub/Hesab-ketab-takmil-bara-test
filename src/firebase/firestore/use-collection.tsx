
'use client';

import { useState, useEffect } from 'react';
import type { Query, DocumentData, FirestoreError } from 'firebase/firestore';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | null; // Error object, or null.
}

/**
 * A temporary, simplified version of useCollection that no longer relies on Firebase.
 * It now simply takes static data and presents it in the expected hook format.
 * This is a transitional step in the migration to Supabase.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {any[] | null | undefined} initialData - The static data to be returned by the hook.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    initialData: any[] | null | undefined,
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    setIsLoading(true);
    if (initialData) {
      // The incoming data from useDashboardData is already in the correct format.
      setData(initialData as WithId<T>[]);
    } else {
      setData(null);
    }
    setIsLoading(false);
  }, [initialData]);
  

  return { data, isLoading, error };
}
