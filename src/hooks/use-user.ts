
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      // Stop loading once we have a user from the session
      if (isLoading) {
          setIsLoading(false);
      }
    });

    // Initial fetch in case the listener is slow to fire
    fetchUser();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
