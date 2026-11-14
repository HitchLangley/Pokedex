const API_URL = 'https://pokeapi.co/api/v2'

// Requests are cached for the lifetime of the page and de-duplicated while in flight,
// so repeated renders or quick page switching never hit the API twice for the same resource.
const cache = new Map()

export async function request (path, { fetchFn = globalThis.fetch } = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`
  if (!cache.has(url)) {
    const promise = fetchFn(url)
      .then((res) => {
        if (!res.ok) throw new Error(`PokeAPI responded with ${res.status} for ${url}`)
        return res.json()
      })
      .catch((err) => {
        cache.delete(url)
        throw err
      })
    cache.set(url, promise)
  }
  return cache.get(url)
}

export function clearCache () {
  cache.clear()
}

export function idFromUrl (url) {
  const match = /\/(\d+)\/?$/.exec(url)
  return match ? Number(match[1]) : null
}

export const api = {
  async fetchPokemonIndex () {
    const data = await request('/pokemon?limit=100000')
    return data.results.map(({ name, url }) => ({ name, id: idFromUrl(url) }))
  },

  async fetchTypes () {
    const data = await request('/type?limit=100')
    // "unknown" and "shadow" have no regular pokemon, "stellar" is a tera-only type
    const hidden = new Set(['unknown', 'shadow', 'stellar'])
    return data.results.map(({ name }) => name).filter((name) => !hidden.has(name))
  },

  async fetchTypeMembers (type) {
    const data = await request(`/type/${type}`)
    return data.pokemon.map(({ pokemon }) => pokemon.name)
  },

  fetchPokemon (name) {
    return request(`/pokemon/${name}`)
  },

  fetchSpecies (url) {
    return request(url)
  }
}
