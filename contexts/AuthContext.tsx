
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import { authClient, storeWebBearerToken, getBearerToken, getUserData, clearAuthTokens } from "@/lib/auth";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth state...');
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      console.log('[AuthContext] Fetching user session...');
      
      // First check if we have a bearer token stored
      const token = await getBearerToken();
      console.log('[AuthContext] Bearer token exists:', !!token);
      
      if (!token) {
        console.log('[AuthContext] No token found, user not authenticated');
        setUser(null);
        setLoading(false);
        return;
      }

      // We have a token, try to validate it by calling the backend
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mdex7zmyjmrw8reaeyzfnp7z3r6fj2v2.app.specular.dev'}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('[AuthContext] Token is valid, user authenticated:', userData.email);
          setUser(userData);
        } else if (response.status === 401) {
          console.log('[AuthContext] Token is invalid or expired, clearing auth data');
          // Token is invalid, clear it
          await clearAuthTokens();
          setUser(null);
        } else {
          console.log('[AuthContext] Unexpected response from auth check:', response.status);
          // Try to restore from storage as fallback
          const storedUser = await getUserData();
          if (storedUser) {
            console.log('[AuthContext] Restored user from storage:', storedUser.email);
            setUser(storedUser);
          } else {
            setUser(null);
          }
        }
      } catch (fetchError) {
        console.error('[AuthContext] Failed to validate token:', fetchError);
        // Network error or other issue - try to restore from storage
        const storedUser = await getUserData();
        if (storedUser) {
          console.log('[AuthContext] Restored user from storage after error:', storedUser.email);
          setUser(storedUser);
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Signing in with email...');
      await authClient.signIn.email({ email, password });
      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log('[AuthContext] Signing up with email...');
      await authClient.signUp.email({
        email,
        password,
        name,
      });
      await fetchUser();
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
      await authClient.signOut();
      await clearAuthTokens();
      setUser(null);
    } catch (error) {
      console.error("[AuthContext] Sign out failed:", error);
      throw error;
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
