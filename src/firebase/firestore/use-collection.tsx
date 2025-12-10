
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';

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

/* Internal implementation of Query */
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Relies on the parent component to provide a valid query when it's ready (e.g., after authentication).
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN.
 * 
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} memoizedTargetRefOrQuery -
 * The Firestore CollectionReference or Query. Hook is dormant if query is null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  // A query is loading if it exists but we don't have data or an error yet.
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedTargetRefOrQuery);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // If the query is null or undefined, it means we are waiting for dependencies (e.g., user auth).
    // We should not be in a loading state, and should clear any previous data.
    if (!memoizedTargetRefOrQuery) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    // We have a valid query, so we are officially in a loading state.
    setIsLoading(true);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false); // Loading is complete.
      },
      (err: FirestoreError) => {
        console.error("Firestore error in useCollection:", err);
        // This is critical for debugging permission errors.
        setError(err);
        setData(null);
        setIsLoading(false); // Loading is complete (with an error).
      }
    );

    // Cleanup function to unsubscribe from the snapshot listener when the component unmounts or the query changes.
    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // The ONLY dependency should be the query itself. The parent component is responsible for changing the query.
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error('useCollection query must be memoized with useMemoFirebase');
  }

  return { data, isLoading, error };
}
