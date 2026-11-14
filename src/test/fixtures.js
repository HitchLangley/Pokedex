import { createStorage } from '../utils/storage'

export function rawPokemon (id, name, types, base = 50) {
  return {
    id,
    name,
    height: 7,
    weight: 69,
    sprites: { front_default: `front/${id}.png`, other: { 'official-artwork': { front_default: `art/${id}.png` } } },
    types: types.map((type, i) => ({ slot: i + 1, type: { name: type } })),
    stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
      .map((stat, i) => ({ base_stat: base + i, stat: { name: stat } })),
    abilities: [{ ability: { name: 'overgrow' }, is_hidden: false }],
    species: { url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` },
    cries: { latest: null }
  }
}

export const POKEMON = [
  rawPokemon(1, 'bulbasaur', ['grass', 'poison']),
  rawPokemon(4, 'charmander', ['fire']),
  rawPokemon(6, 'charizard', ['fire', 'flying']),
  rawPokemon(7, 'squirtle', ['water']),
  rawPokemon(25, 'pikachu', ['electric']),
  rawPokemon(150, 'mewtwo', ['psychic'])
]

export function createFakeApi (pokemon = POKEMON) {
  const byName = new Map(pokemon.map((p) => [p.name, p]))
  const types = [...new Set(pokemon.flatMap((p) => p.types.map((t) => t.type.name)))]

  return {
    calls: [],
    fetchPokemonIndex: async () => pokemon.map(({ id, name }) => ({ id, name })),
    fetchTypes: async () => types,
    async fetchTypeMembers (type) {
      this.calls.push(`type:${type}`)
      return pokemon.filter((p) => p.types.some((t) => t.type.name === type)).map((p) => p.name)
    },
    async fetchPokemon (name) {
      this.calls.push(`pokemon:${name}`)
      if (!byName.has(name)) throw new Error('not found')
      return byName.get(name)
    },
    fetchSpecies: async () => ({ flavor_text_entries: [], genera: [] })
  }
}

export function memoryStorage (initial = {}) {
  const data = new Map(Object.entries(initial).map(([k, v]) => [`pokedex:${k}`, JSON.stringify(v)]))
  const backend = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value)
  }
  return { storage: createStorage(backend), data }
}

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
