'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isDemoUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  useEffect(() => {
    // Check if demo user session is saved in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedDemo = localStorage.getItem('biodna_demo_user');
        if (savedDemo) {
          const parsed = JSON.parse(savedDemo);
          setUser(parsed as unknown as User);
          setIsDemoUser(true);
          setLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem('biodna_demo_user');
      }
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (!isDemoUser) {
          setUser(currentUser);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase Auth listener initialized in offline/demo mode");
      setLoading(false);
    }
  }, [isDemoUser]);

  const signIn = async (email: string, pass: string) => {
    try {
      // Attempt real Firebase login
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      setUser(cred.user);
      setIsDemoUser(false);
      localStorage.removeItem('biodna_demo_user');
    } catch (err: any) {
      // If Firebase project credentials are not configured yet, offer graceful demo login
      if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key' || err.message?.includes('API key')) {
        const mockUser = {
          uid: 'demo-user-123',
          email: email,
          displayName: email.split('@')[0],
          photoURL: null,
          emailVerified: true
        } as unknown as User;
        setUser(mockUser);
        setIsDemoUser(true);
        localStorage.setItem('biodna_demo_user', JSON.stringify(mockUser));
        return;
      }
      throw err;
    }
  };

  const signUp = async (email: string, pass: string, name?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && cred.user) {
        await updateProfile(cred.user, { displayName: name });
      }
      setUser(cred.user);
      setIsDemoUser(false);
      localStorage.removeItem('biodna_demo_user');
    } catch (err: any) {
      if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key' || err.message?.includes('API key')) {
        const mockUser = {
          uid: 'demo-user-' + Date.now(),
          email: email,
          displayName: name || email.split('@')[0],
          photoURL: null,
          emailVerified: true
        } as unknown as User;
        setUser(mockUser);
        setIsDemoUser(true);
        localStorage.setItem('biodna_demo_user', JSON.stringify(mockUser));
        return;
      }
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      setUser(cred.user);
      setIsDemoUser(false);
      localStorage.removeItem('biodna_demo_user');
    } catch (err: any) {
      if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key' || err.message?.includes('API key')) {
        const mockUser = {
          uid: 'demo-google-user',
          email: 'biotech.researcher@example.com',
          displayName: 'Bioinformatics Researcher',
          photoURL: null,
          emailVerified: true
        } as unknown as User;
        setUser(mockUser);
        setIsDemoUser(true);
        localStorage.setItem('biodna_demo_user', JSON.stringify(mockUser));
        return;
      }
      throw err;
    }
  };

  const sendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key' || err.message?.includes('API key')) {
        // Mock success in presentation demo mode
        return;
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // Ignored in demo mode
    }
    setUser(null);
    setIsDemoUser(false);
    localStorage.removeItem('biodna_demo_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      sendResetEmail,
      logout,
      isDemoUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

