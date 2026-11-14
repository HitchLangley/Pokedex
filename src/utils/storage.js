// localStorage can be unavailable (private mode, sandboxed iframes) — never let it break the app
export function createStorage (backend = safeLocalStorage(), prefix = 'pokedex:') {
  return {
    get (key, fallback) {
      try {
        const raw = backend?.getItem(prefix + key)
        return raw == null ? fallback : JSON.parse(raw)
      } catch {
        return fallback
      }
    },
    set (key, value) {
      try {
        backend?.setItem(prefix + key, JSON.stringify(value))
      } catch {
        // ignore quota / access errors
      }
    }
  }
}

function safeLocalStorage () {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
