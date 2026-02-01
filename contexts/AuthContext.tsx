
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { authClient, storeWebBearerToken, getBearerToken, getUserData, clearAuthTokens, storeUserData, storeBearerToken } from "@/lib/auth";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUserDirectly: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

/**
 * AuthProvider - Manages authentication state using custom backend endpoints
 * 
 * Authentication Flow:
 * 1. User enters email (and optional first name) on /auth screen
 * 2. Frontend calls POST /api/auth/register with { email, firstName }
 * 3. Backend auto-creates user or returns existing user with session token
 * 4. Frontend stores session token and user data locally
 * 5. All authenticated API calls include "Authorization: Bearer {token}" header
 * 
 * Session Persistence:
 * - On app load, checks for stored token and verifies with GET /api/auth/session-status
 * - If valid, restores user session automatically
 * - If invalid, clears stored data and requires re-authentication
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth state...');
    initializeAuthSession();
  }, []);

  const initializeAuthSession = async () => {
    let isMounted = true;
    
    try {
      if (isMounted) {
        setLoading(true);
      }
      console.log('[AuthContext] Checking for existing session...');
      
      // Check if we have a stored token
      const token = await getBearerToken();
      
      if (!token) {
        console.log('[AuthContext] No token found - user needs to log in');
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      // Verify the token with the backend
      console.log('[AuthContext] Verifying session with backend...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(`${Constants.expoConfig?.extra?.backendUrl}/api/auth/session-status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!isMounted) {
          console.log('[AuthContext] Component unmounted, skipping state updates');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            console.log('[AuthContext] Session verified, user:', data.user.email);
            await storeUserData(data.user);
            if (isMounted) {
              setUser(data.user);
            }
          } else {
            console.log('[AuthContext] Session not authenticated');
            await clearAuthTokens();
            if (isMounted) {
              setUser(null);
            }
          }
        } else {
          console.log('[AuthContext] Session verification failed:', response.status);
          // Token is invalid, clear it
          await clearAuthTokens();
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error('[AuthContext] Session verification timed out');
        } else {
          console.error('[AuthContext] Session verification network error:', fetchError);
        }
        
        // On network error, try to use stored user data as fallback
        const storedUser = await getUserData();
        if (storedUser && isMounted) {
          console.log('[AuthContext] Using stored user data as fallback:', storedUser.email);
          setUser(storedUser);
        } else if (isMounted) {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("[AuthContext] Failed to initialize auth session:", error);
      // On error, try to use stored user data as fallback
      try {
        const storedUser = await getUserData();
        if (storedUser && isMounted) {
          console.log('[AuthContext] Using stored user data as fallback:', storedUser.email);
          setUser(storedUser);
        } else if (isMounted) {
          setUser(null);
        }
      } catch (fallbackError) {
        console.error('[AuthContext] Failed to load stored user data:', fallbackError);
        if (isMounted) {
          setUser(null);
        }
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      console.log('[AuthContext] Fetching user session...');
      
      const token = await getBearerToken();
      if (!token) {
        console.log('[AuthContext] No token found');
        setUser(null);
        return;
      }

      // Fetch user from backend
      const response = await fetch(`${Constants.expoConfig?.extra?.backendUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          console.log('[AuthContext] User fetched:', data.user.email);
          await storeUserData(data.user);
          setUser(data.user);
          return;
        }
      }
      
      // If fetch fails, try to use stored user data
      const storedUser = await getUserData();
      if (storedUser) {
        console.log('[AuthContext] Using stored user data:', storedUser.email);
        setUser(storedUser);
      } else {
        console.log('[AuthContext] No user found');
        setUser(null);
      }
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user:", error);
      // Try to use stored user data as fallback
      const storedUser = await getUserData();
      if (storedUser) {
        setUser(storedUser);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const setUserDirectly = (userData: User) => {
    console.log('[AuthContext] Setting user directly:', userData.email);
    setUser(userData);
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Signing in with email...');
      const result = await authClient.signIn.email({ email, password });
      console.log('[AuthContext] Sign in result:', result);
      
      // Get session after sign in
      const session = await authClient.getSession();
      if (session?.data?.user) {
        await storeUserData(session.data.user);
        setUser(session.data.user);
      } else {
        await fetchUser();
      }
    } catch (error) {
      console.error("[AuthContext] Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log('[AuthContext] Signing up with email...');
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });
      console.log('[AuthContext] Sign up result:', result);
      
      // Get session after sign up
      const session = await authClient.getSession();
      if (session?.data?.user) {
        await storeUserData(session.data.user);
        setUser(session.data.user);
      } else {
        await fetchUser();
      }
    } catch (error) {
      console.error("[AuthContext] Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log(`[AuthContext] Signing in with ${provider}...`);
      if (Platform.OS === "web") {
        const token = await openOAuthPopup(provider);
        storeWebBearerToken(token);
        await fetchUser();
      } else {
        await authClient.signIn.social({
          provider,
          callbackURL: "/(tabs)",
        });
        await fetchUser();
      }
    } catch (error) {
      console.error(`[AuthContext] ${provider} sign in failed:`, error);
      throw error;
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      console.log('[AuthContext] Signing out...');
      // Clear local state immediately (don't wait for server)
      setUser(null);
      await clearAuthTokens();
      console.log('[AuthContext] Sign out complete');
    } catch (error) {
      console.error("[AuthContext] Sign out failed:", error);
      // Even if there's an error, clear local state
      setUser(null);
      await clearAuthTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signOut,
        fetchUser,
        setUserDirectly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
