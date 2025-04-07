
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '@/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on load
  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      
      try {
        // Get session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (session) {
          await setUserFromSession(session);
        }
      } catch (error) {
        console.error('Session error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await setUserFromSession(session);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Helper to set user from Supabase session
  const setUserFromSession = async (session: Session) => {
    if (!session.user) return;
    
    setUser({
      id: session.user.id,
      email: session.user.email || '',
      created_at: session.user.created_at || new Date().toISOString()
    });
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      // Validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('Signed in successfully');
      navigate('/notes');
    } catch (error) {
      let message = 'Failed to sign in';
      if (error instanceof Error) message = error.message;
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      // Validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('Account created successfully. Please check your email for verification.');
      navigate('/login');
    } catch (error) {
      let message = 'Failed to create account';
      if (error instanceof Error) message = error.message;
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to sign out');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
