'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface AuthStatus {
  isAuthenticated: boolean;
  email?: string;
  userId?: string;
  isLoading: boolean;
}

export function useAuth() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    email: undefined,
    userId: undefined,
    isLoading: true,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthStatus({
        isAuthenticated: !!session,
        email: session?.user?.email,
        userId: session?.user?.id,
        isLoading: false,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus({
        isAuthenticated: !!session,
        email: session?.user?.email,
        userId: session?.user?.id,
        isLoading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return authStatus;
}
