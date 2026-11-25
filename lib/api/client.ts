/**
 * Central HTTP client for the FlagForge Node.js/Express backend.
 *
 * When NEXT_PUBLIC_FLAGFORGE_API_URL is unset the services fall back to the
 * in-memory mock adapter, so the UI can be developed without a backend.
 * SDK keys and other secrets must stay on the backend; this client only ever
 * sends the user's session token.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_FLAGFORGE_API_URL

export const isMockMode = !API_BASE_URL

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type TokenProvider = () => Promise<string | null>

let getAccessToken: TokenProvider = async () => null

/** Register a session token provider, e.g. Supabase `auth.getSession()`, once auth is wired up. */
export function setAccessTokenProvider(provider: TokenProvider) {
  getAccessToken = provider
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.message ?? response.statusText, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const json = (body: unknown) => JSON.stringify(body)
