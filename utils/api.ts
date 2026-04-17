
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getBearerToken } from '@/lib/auth';

const _configuredBackendUrl = Constants.expoConfig?.extra?.backendUrl as string | undefined;

if (!_configuredBackendUrl) {
  console.error(
    '[API] CRITICAL: backendUrl is not set in app.json extra. ' +
    'All API calls will fail. Set expo.extra.backendUrl in app.json.'
  );
}

export const BACKEND_URL: string = _configuredBackendUrl || '';

console.log('[API] Initialized with backend URL:', BACKEND_URL || '(NOT SET — check app.json)');

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
export async function getAuthToken(): Promise<string> {
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
  try {
    const authToken = await getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      ...options.headers,
    };

    const url = `${BACKEND_URL}${endpoint}`;
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`);
    console.log(`[API] Full URL: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for Better Auth session
    });

    console.log(`[API] Response received: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`[API] Request failed: ${response.status} ${response.statusText}`);
      // Read body once here — callers must NOT call response.text()/json() again
      const errorText = await response.text().catch(() => '');
      console.error('[API] Error response:', errorText);
    }

    return response;
  } catch (error: any) {
    console.error(`[API] Network error in makeAuthenticatedRequest:`, error);
    console.error(`[API] Error details:`, {
      name: error?.name,
      message: error?.message,
      endpoint,
      method: options.method || 'GET'
    });
    throw error;
  }
}

// Authenticated GET request
export async function authenticatedGet<T = any>(endpoint: string): Promise<T> {
  const response = await makeAuthenticatedRequest(endpoint, {
    method: 'GET',
  });

  if (!response.ok) {
    // Body was already consumed in makeAuthenticatedRequest — use statusText only
    throw new Error(`GET ${endpoint} failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    console.error(`[API] GET ${endpoint} returned non-JSON content-type: ${contentType}`, text.slice(0, 200));
    throw new Error(`GET ${endpoint} returned non-JSON response`);
  }

  try {
    return await response.json();
  } catch (parseError) {
    console.error(`[API] GET ${endpoint} JSON parse error:`, parseError);
    throw new Error(`GET ${endpoint} failed to parse JSON response`);
  }
}

// Authenticated POST request
export async function authenticatedPost<T = any>(
  endpoint: string,
  data?: any
): Promise<T> {
  try {
    console.log(`[API] authenticatedPost called for ${endpoint}`);
    console.log(`[API] Request data:`, JSON.stringify(data, null, 2));
    
    const response = await makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : JSON.stringify({}),
    });

    console.log(`[API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // Body was already consumed in makeAuthenticatedRequest — use statusText only
      throw new Error(`POST ${endpoint} failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`[API] Response data:`, responseData);
    return responseData;
  } catch (error: any) {
    console.error(`[API] authenticatedPost exception:`, error);
    console.error(`[API] Exception details:`, {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    throw error;
  }
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
    const errorText = await response.text().catch(() => response.statusText);
    console.error(`[API] PUT ${endpoint} error body:`, errorText);
    throw new Error(`PUT ${endpoint} failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null as unknown as T;
  }

  try {
    return await response.json();
  } catch (parseError) {
    console.error(`[API] PUT ${endpoint} JSON parse error:`, parseError);
    throw new Error(`PUT ${endpoint} failed to parse JSON response`);
  }
}

// Authenticated DELETE request
export async function authenticatedDelete<T = any>(
  endpoint: string
): Promise<T | null> {
  // Use fetch directly so we can read the error body ourselves (makeAuthenticatedRequest
  // already consumes the body on error, leaving nothing for us to read here).
  const authToken = await getAuthToken();
  const url = `${BACKEND_URL}${endpoint}`;
  console.log(`[API] DELETE ${endpoint}`);
  console.log(`[API] Full URL: ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      credentials: 'include',
    });
  } catch (networkError: any) {
    console.error(`[API] DELETE ${endpoint} network error:`, networkError);
    throw networkError;
  }

  console.log(`[API] Response received: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.error(`[API] DELETE ${endpoint} failed — status: ${response.status}, body: ${errorBody}`);
    // Attach status and body to the thrown error so callers can surface the real cause
    const err = new Error(`DELETE ${endpoint} failed: ${response.status} ${response.statusText}${errorBody ? ` — ${errorBody}` : ''}`);
    (err as any).status = response.status;
    (err as any).responseBody = errorBody;
    throw err;
  }

  // 204 No Content — nothing to parse
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Push subscription helpers
export async function registerPushSubscription(
  token: string,
  oneSignalSubscriptionId: string,
  platform: 'ios' | 'android' | 'web'
): Promise<void> {
  console.log('[PushSubscriptions] Registering subscription:', { oneSignalSubscriptionId, platform });
  const url = `${BACKEND_URL}/api/push-subscriptions`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ oneSignalSubscriptionId, platform }),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[PushSubscriptions] Register failed:', response.status, errorText);
    } else {
      console.log('[PushSubscriptions] Subscription registered successfully');
    }
  } catch (error) {
    console.error('[PushSubscriptions] Register network error:', error);
  }
}

export async function unregisterPushSubscription(
  token: string,
  oneSignalSubscriptionId: string
): Promise<void> {
  console.log('[PushSubscriptions] Unregistering subscription:', oneSignalSubscriptionId);
  const url = `${BACKEND_URL}/api/push-subscriptions/${encodeURIComponent(oneSignalSubscriptionId)}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[PushSubscriptions] Unregister failed:', response.status, errorText);
    } else {
      console.log('[PushSubscriptions] Subscription unregistered successfully');
    }
  } catch (error) {
    console.error('[PushSubscriptions] Unregister network error:', error);
  }
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
