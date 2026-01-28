import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './config';

// Allowed emails - add your email(s) here
// Leave empty to allow any authenticated user
const ALLOWED_EMAILS: string[] = [
  // 'your-email@gmail.com',
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthorized: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user's email is in the allowed list
  const isAuthorized =
    ALLOWED_EMAILS.length === 0 ||
    (user?.email ? ALLOWED_EMAILS.includes(user.email) : false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Check if email is authorized
      if (
        ALLOWED_EMAILS.length > 0 &&
        result.user.email &&
        !ALLOWED_EMAILS.includes(result.user.email)
      ) {
        await firebaseSignOut(auth);
        setError(`Access denied. ${result.user.email} is not authorized.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthorized,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
