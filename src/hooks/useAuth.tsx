import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  // Why: admin can disable accounts (per Admin PDF). When disabled, we block in-app access.
  isActive: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch role with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchAccountStatus(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setIsActive(true);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchAccountStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching role:', error);
        setRole(null);
      } else {
        setRole(data?.role as AppRole ?? null);
      }
    } catch (error) {
      console.error('Error fetching role:', error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountStatus = async (userId: string) => {
    try {
      // Note: profiles now has `is_active` (added via migration).
      const { data, error } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching account status:', error);
        setIsActive(true);
        return;
      }

      const active = (data as any)?.is_active;
      if (active === false) {
        setIsActive(false);
        // Why: If admin disabled the account, we proactively sign the user out to block access.
        await supabase.auth.signOut();
        setRole(null);
        setUser(null);
        setSession(null);
      } else {
        setIsActive(true);
      }
    } catch (error) {
      console.error('Error fetching account status:', error);
      setIsActive(true);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setIsActive(true);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, isActive, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}



