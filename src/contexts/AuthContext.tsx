import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserWithProfile } from '../types';
import { useToast } from '@/hooks/use-toast';
import { sendSignUpConfirmationEmail } from '@/services/emailService';

interface AuthContextType {
  user: UserWithProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any, user: any }>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    setLoading(true);
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      
      if (currentSession && currentSession.user) {
        // Fetch profile on auth changes - using setTimeout to avoid Supabase auth deadlocks
        setTimeout(async () => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .maybeSingle();
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile during auth change:', profileError);
          }
          
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            profile: profile || undefined,
          });
          
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    
    // THEN check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (initialSession) {
          setSession(initialSession);
          
          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', initialSession.user.id)
            .maybeSingle();
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
          }
          
          // Make sure we're setting the profile with all required fields,
          // even if some are undefined
          setUser({
            id: initialSession.user.id,
            email: initialSession.user.email || '',
            profile: profile || undefined,
          });
        }
      } catch (error) {
        console.error('Unexpected error during auth initialization:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getInitialSession();
    
    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Sign in with email and password
  const signIn = async (email: string, password: string, rememberMe = true) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      
      return { error };
    }
  };
  
  // Sign up with email and password
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      // Step 1: Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });
      
      if (authError) {
        toast({
          title: "Registration Failed",
          description: authError.message,
          variant: "destructive"
        });
        return { error: authError, user: null };
      }
      
      if (!authData.user) {
        return { 
          error: new Error("Failed to create user account"), 
          user: null 
        };
      }

      // Step 2: Create profile with the auth user's ID
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }
      
      // Step 3: Send welcome email
      try {
        await sendSignUpConfirmationEmail({
          email: email,
          name: `${firstName} ${lastName}`,
          company: '',
          phone: ''
        });
        console.log('Signup confirmation email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send signup confirmation email:', emailError);
        // Continue with signup process even if email fails
      }
      
      toast({
        title: "Welcome to Circa! 🌱",
        description: "Please check your email to confirm your account. We'll help you get started right away!",
        variant: "default",
        duration: 10000,
      });

      // Return successful signup - the Register component will handle redirection
      return { error: null, user: authData.user };
    } catch (error: any) {
      console.error("Unexpected error during registration:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      
      return { error, user: null };
    }
  };
  
  // Sign out
  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // 1. Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
      }
      
      // 2. Force clear local state immediately (don't wait for auth listener)
      setUser(null);
      setSession(null);
      
      // 3. Clear all possible auth-related storage keys
      const authStorageKeys = [
        'supabase.auth.token',
        'sb-vfdbyvnjhimmnbyhxyun-auth-token',
        'supabase-auth-token',
        'supabase.session'
      ];
      
      // Clear localStorage
      authStorageKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove localStorage key: ${key}`, e);
        }
      });
      
      // Clear sessionStorage
      authStorageKeys.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove sessionStorage key: ${key}`, e);
        }
      });
      
      // 4. Clear any cookies (if any)
      try {
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      } catch (e) {
        console.warn('Failed to clear cookies:', e);
      }
      
      // 5. Show success message
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      
      // 6. Force navigation to home page with a small delay to ensure toast shows
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      
      // Force clear state and redirect even if there's an error
      setUser(null);
      setSession(null);
      
      // Clear all storage as fallback
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Failed to clear storage:', e);
      }
      
      toast({
        title: "Logged Out",
        description: "You have been logged out",
      });
      
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  };
  
  // Update user profile
  const updateProfile = async (profileData: Partial<Profile>) => {
    try {
      if (!user) {
        return { error: new Error('User not authenticated') };
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);
      
      if (error) {
        toast({
          title: "Profile Update Failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }
      
      // Update the local user state with the updated profile data
      setUser(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          profile: {
            ...prev.profile,
            ...profileData
          }
        };
      });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Profile Update Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      
      return { error };
    }
  };
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
  }), [user, session, loading]);
  
  return (
    <AuthContext.Provider value={contextValue}>
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
