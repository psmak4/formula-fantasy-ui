const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const DEBUG_USER_STORAGE_KEY = 'ff_debug_user_id'
const ALLOW_DEBUG_AUTH = import.meta.env.VITE_ALLOW_DEBUG_AUTH === 'true'

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set')
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

function readStoredDebugUserId(): string {
  if (!import.meta.env.DEV || !ALLOW_DEBUG_AUTH || typeof window === 'undefined') return ''
  return window.localStorage.getItem(DEBUG_USER_STORAGE_KEY) ?? ''
}

let debugUserId = readStoredDebugUserId()
let authTokenGetter: (() => Promise<string | null>) | null = null

export function setAuthTokenGetter(getter: (() => Promise<string | null>) | null): void {
  authTokenGetter = getter
}

export function getDebugUserId(): string {
  return debugUserId
}

export function setDebugUserId(value: string): void {
  const nextValue = value.trim()
  debugUserId = nextValue

  if (!import.meta.env.DEV || !ALLOW_DEBUG_AUTH || typeof window === 'undefined') return

  if (nextValue) {
    window.localStorage.setItem(DEBUG_USER_STORAGE_KEY, nextValue)
  } else {
    window.localStorage.removeItem(DEBUG_USER_STORAGE_KEY)
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (authTokenGetter && !headers.has('Authorization')) {
    const token = await authTokenGetter()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  if (import.meta.env.DEV && ALLOW_DEBUG_AUTH && debugUserId && !headers.has('X-Debug-User-Id')) {
    headers.set('X-Debug-User-Id', debugUserId)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body })
}

export { API_BASE_URL }
