/**
 * Client-side in-memory token store.
 *
 * Keeps the Supabase access_token available synchronously for API calls
 * without exposing it via NEXT_PUBLIC_* env vars or localStorage.
 *
 * The token is set by ClientHubApp via onAuthStateChange and refreshed
 * automatically whenever Supabase rotates the session (TOKEN_REFRESHED).
 */

let _token: string | null = null

export function setAuthToken(token: string | null): void {
  _token = token
}

export function getAuthToken(): string | null {
  return _token
}

export function clearAuthToken(): void {
  _token = null
}
