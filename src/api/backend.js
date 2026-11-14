// Client for our own Node.js API. When the app is built as a static site (GitHub Pages)
// there is no backend: `enabled` is false and the app falls back to local favourites.

export class HttpError extends Error {
  constructor (status, message) {
    super(message)
    this.status = status
  }
}

export function createBackend ({
  enabled = import.meta.env.VITE_STATIC !== '1',
  baseUrl = import.meta.env.VITE_API_URL ?? '',
  fetchFn = (...args) => globalThis.fetch(...args)
} = {}) {
  async function call (method, path, body) {
    const res = await fetchFn(`${baseUrl}/api${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })
    if (res.status === 204) return null
    const isJson = res.headers.get('content-type')?.includes('application/json')
    const data = isJson ? await res.json() : null
    if (!res.ok || !isJson) throw new HttpError(res.status, data?.error || `Request failed (${res.status})`)
    return data
  }

  return {
    enabled,
    me: () => call('GET', '/me'),
    logout: () => call('POST', '/auth/logout'),
    listFavorites: async () => (await call('GET', '/favorites')).favorites,
    addFavorite: (name) => call('PUT', `/favorites/${encodeURIComponent(name)}`),
    removeFavorite: (name) => call('DELETE', `/favorites/${encodeURIComponent(name)}`),
    importFavorites: async (names) => (await call('POST', '/favorites/import', { names })).favorites,
    loginUrl: (provider, returnTo = '/') =>
      `${baseUrl}/api/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`
  }
}
