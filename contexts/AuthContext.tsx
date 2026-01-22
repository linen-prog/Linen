
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import { authClient, storeWebBearerToken, getBearerToken, getUserData } from "@/lib/auth";

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
        console.log('[AuthContext] No token found, checking for stored user data...');
        
        // Check if we have stored user data from previous session
        const storedUser = await getUserData();
        if (storedUser) {
          console.log('[AuthContext] Restored user from storage:', storedUser.email);
          setUser(storedUser);
        } else {
          console.log('[AuthContext] No stored user data, user not authenticated');
          setUser(null);
        }
        
        setLoading(false);
        return;
      }

      // We have a token, try to restore the user from storage first
      const storedUser = await getUserData();
      if (storedUser) {
        console.log('[AuthContext] Restored user from storage:', storedUser.email);
        setUser(storedUser);
        setLoading(false);
        return;
      }

      // If no stored user, try to get session from Better Auth
      try {
        const session = await authClient.getSession();
        console.log('[AuthContext] Session data:', session?.data);
        
        if (session?.data?.user) {
          console.log('[AuthContext] User authenticated via Better Auth:', session.data.user.email);
          setUser(session.data.user as User);
        } else {
          console.log('[AuthContext] No valid session found');
          setUser(null);
        }
      } catch (sessionError) {
        console.log('[AuthContext] Better Auth session check failed, but token exists - user may still be authenticated');
        // Don't clear the user if we have a token, the backend will validate it
      }
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user:", error);
      
      // Even if there's an error, try to restore from storage
      try {
        const storedUser = await getUserData();
        if (storedUser) {
          console.log('[AuthContext] Restored user from storage after error:', storedUser.email);
          setUser(storedUser);
        } else {
          setUser(null);
        }
      } catch (storageError) {
        console.error("[AuthContext] Failed to restore from storage:", storageError);
        setUser(null);
      }
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
