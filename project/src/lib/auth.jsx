import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false); // prevent concurrent fetches

  async function fetchProfile(userId) {
    // Guard: don't fetch if already fetching, or userId is clearly invalid
    if (!userId || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setProfile(data);
      } else {
        // Profile not found — don't loop, just clear and stop loading
        setProfile(null);
        if (error) console.warn('fetchProfile error:', error.message);
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        fetchingRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    fetchingRef.current = false; // reset so fetchProfile can run
    await fetchProfile(data.user.id);
    return data;
  }

  async function signUp(email, password, metadata) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    fetchingRef.current = false;
  }

  async function updateProfile(updates) {
    if (!profile) return;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) setProfile(data);
    return data;
  }

  const value = {
    user, profile, loading,
    signIn, signUp, signOut,
    updateProfile, fetchProfile,
    isAdmin: profile?.role === 'Admin',
    isTeacher: profile?.role === 'Teacher',
    isStudent: profile?.role === 'Student',
    isApplicant: profile?.role === 'Applicant',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}