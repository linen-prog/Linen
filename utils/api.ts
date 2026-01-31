
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getBearerToken } from '@/lib/auth';

export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';

console.log('🔗 API initialized with backend URL:', BACKEND_URL);

// Generate a persistent guest token for this device
async function getGuestToken(): Promise<string> {
  const GUEST_TOKEN_KEY = 'linen_guest_token';
  
  try {
    // Try to get existing guest token
    let guestToken: string | null = null;
    
    if (Platform.OS === 'web') {
      guestToken = localStorage.getItem(GUEST_TOKEN_KEY);
    } else {
      guestToken = await SecureStore.getItemAsync(GUEST_TOKEN_KEY);
    }
    
    // If we have a token, return it
    if (guestToken) {
      console.log('[API] Using existing guest token');
      return guestToken;
    }
    
    // Generate new guest token
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    guestToken = `guest-token-${timestamp}-${randomId}`;
    
    // Store it for future use
    if (Platform.OS === 'web') {
      localStorage.setItem(GUEST_TOKEN_KEY, guestToken);
    } else {
      await SecureStore.setItemAsync(GUEST_TOKEN_KEY, guestToken);
    }
    
    console.log('[API] Generated new guest token');
    return guestToken;
  } catch (error) {
    console.error('[API] Failed to get/generate guest token:', error);
    // Fallback to a temporary token
    return `guest-token-${Date.now()}-fallback`;
  }
}

// Helper function to get the appropriate auth token
async function getAuthToken(): Promise<string> {
  // First, try to get Better Auth bearer token (for authenticated users)
  const bearerToken = await getBearerToken();
  
  if (bearerToken) {
    console.log('[API] Using Better Auth bearer token');
    return bearerToken;
  }
  
  // Fall back to guest token if no Better Auth session
  console.log('[API] No Better Auth session, using guest token');
  return await getGuestToken();
}

// Helper function to make authenticated API calls
async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const authToken = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    ...options.headers,
  };

  console.log(`[API] ${options.method || 'GET'} ${endpoint}`);

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for Better Auth session
  });

  if (!response.ok) {
    console.error(`[API] Request failed: ${response.status} ${response.statusText}`);
    const errorText = await response.text();
    console.error('[API] Error response:', errorText);
  }

  return response;
}

// Authenticated GET request
export async function authenticatedGet<T = any>(endpoint: string): Promise<T> {
  const response = await makeAuthenticatedRequest(endpoint, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`GET ${endpoint} failed: ${response.statusText}`);
  }

  return response.json();
}

// Authenticated POST request
export async function authenticatedPost<T = any>(
  endpoint: string,
  data?: any
): Promise<T> {
  const response = await makeAuthenticatedRequest(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`POST ${endpoint} failed: ${response.statusText}`);
  }

  return response.json();
}

// Authenticated PUT request
export async function authenticatedPut<T = any>(
  endpoint: string,
  data?: any
): Promise<T> {
  const response = await makeAuthenticatedRequest(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`PUT ${endpoint} failed: ${response.statusText}`);
  }

  return response.json();
}

// Authenticated DELETE request
export async function authenticatedDelete<T = any>(
  endpoint: string
): Promise<T> {
  const response = await makeAuthenticatedRequest(endpoint, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`DELETE ${endpoint} failed: ${response.statusText}`);
  }

  return response.json();
}

// Public GET request (no authentication)
export async function apiGet<T = any>(endpoint: string): Promise<T> {
  console.log(`[API] GET ${endpoint} (public)`);
  
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`[API] Request failed: ${response.status} ${response.statusText}`);
    throw new Error(`GET ${endpoint} failed: ${response.statusText}`);
  }

  return response.json();
}

// Public POST request (no authentication)
export async function apiPost<T = any>(
  endpoint: string,
  data?: any
): Promise<T> {
  console.log(`[API] POST ${endpoint} (public)`);
  
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : JSON.stringify({}),
  });

  if (!response.ok) {
    console.error(`[API] Request failed: ${response.status} ${response.statusText}`);
    throw new Error(`POST ${endpoint} failed: ${response.statusText}`);
  }

  return response.json();
}
