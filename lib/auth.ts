
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Get backend URL from app.json configuration
const API_URL = Constants.expoConfig?.extra?.backendUrl || "";

// Log the API URL for debugging
console.log('[Auth] Backend URL configured:', API_URL);

export const BEARER_TOKEN_KEY = "linen_bearer_token";
export const USER_DATA_KEY = "linen_user_data";

// Platform-specific storage: localStorage for web, SecureStore for native
const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      deleteItem: (key: string) => localStorage.removeItem(key),
    }
  : SecureStore;

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "linen",
      storagePrefix: "linen",
      storage,
    }),
  ],
  // On web, use bearer token for authenticated requests
  ...(Platform.OS === "web" && {
    fetchOptions: {
      auth: {
        type: "Bearer" as const,
        token: () => localStorage.getItem(BEARER_TOKEN_KEY) || "",
      },
    },
  }),
});

/**
 * Get bearer token from platform-specific storage
 */
export async function getBearerToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(BEARER_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    }
  } catch (error) {
    console.error("[Auth] Error retrieving bearer token:", error);
    return null;
  }
}

/**
 * Store bearer token in platform-specific storage
 */
export async function storeBearerToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(BEARER_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
    }
    console.log('[Auth] Bearer token stored successfully');
  } catch (error) {
    console.error("[Auth] Error storing bearer token:", error);
  }
}

/**
 * Store web bearer token (legacy function for compatibility)
 */
export function storeWebBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  }
}

/**
 * Store user data in platform-specific storage for persistence across hot reloads
 */
export async function storeUserData(user: any): Promise<void> {
  try {
    const userData = JSON.stringify(user);
    if (Platform.OS === "web") {
      localStorage.setItem(USER_DATA_KEY, userData);
    } else {
      await SecureStore.setItemAsync(USER_DATA_KEY, userData);
    }
    console.log('[Auth] User data stored successfully');
  } catch (error) {
    console.error("[Auth] Error storing user data:", error);
  }
}

/**
 * Get user data from platform-specific storage
 */
export async function getUserData(): Promise<any | null> {
  try {
    let userData: string | null;
    if (Platform.OS === "web") {
      userData = localStorage.getItem(USER_DATA_KEY);
    } else {
      userData = await SecureStore.getItemAsync(USER_DATA_KEY);
    }
    
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error("[Auth] Error retrieving user data:", error);
    return null;
  }
}

/**
 * Clear all authentication tokens and user data
 */
export async function clearAuthTokens(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(BEARER_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
    } else {
      await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_DATA_KEY);
    }
    console.log('[Auth] Auth tokens cleared');
  } catch (error) {
    console.error("[Auth] Error clearing auth tokens:", error);
  }
}

export { API_URL };
