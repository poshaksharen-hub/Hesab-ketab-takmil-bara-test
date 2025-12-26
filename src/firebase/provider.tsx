'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { supabase } from '@/lib/supabase-client';

// This file is now a proxy to the new Supabase auth hooks for compatibility.
// It should be phased out as components are migrated.

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}


/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            setSession(data.session);
        } catch (e: any) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);


  return { 
    user: session?.user ?? null as any, 
    isUserLoading: isLoading, 
    userError: error 
  };
};

export const useAuth = () => {
    // This is a placeholder. Direct auth interactions should be replaced
    // with supabase methods like supabase.auth.signInWithPassword(), etc.
    return supabase.auth;
}

export const useFirestore = () => {
    // This is a placeholder. Firestore interactions should be replaced
    // with Supabase table queries.
    // We return the supabase client here so it can be used for queries.
    return supabase;
}
