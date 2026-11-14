import { describe, expect, it } from 'vitest'
import { formatId, formatName, normalizePokemon, pickFlavorText, typeTextColor } from './pokemon'
import { buildQuery, parseQuery } from './urlState'
import { createStorage } from './storage'
import { idFromUrl } from '../api/pokeapi'
import { rawPokemon } from '../test/fixtures'

describe('pokemon utils', () => {
  it('formats names and ids', () => {
    expect(formatName('mr-mime')).toBe('Mr Mime')
    expect(formatId(25)).toBe('#0025')
  })

  it('picks readable text colours for type tags', () => {
    expect(typeTextColor('electric')).toBe('#1f1f1f')
    expect(typeTextColor('ghost')).toBe('#fff')
  })

  it('normalizes the raw API payload', () => {
    const pokemon = normalizePokemon(rawPokemon(6, 'charizard', ['fire', 'flying'], 80))
    expect(pokemon).toMatchObject({
      id: 6,
      sprite: 'art/6.png',
      types: ['fire', 'flying'],
      height: 0.7,
      weight: 6.9,
      total: 80 * 6 + 15
    })
    expect(pokemon.stats[3]).toEqual({ key: 'special-attack', label: 'Sp. Atk', value: 83 })
  })

  it('picks the latest English flavour text and cleans control characters', () => {
    const species = {
      flavor_text_entries: [
        { flavor_text: 'Old\ftext', language: { name: 'en' } },
        { flavor_text: 'Neuer Text', language: { name: 'de' } },
        { flavor_text: 'A strange\nseed was\fplanted.', language: { name: 'en' } }
      ]
    }
    expect(pickFlavorText(species)).toBe('A strange seed was planted.')
    expect(pickFlavorText(null)).toBeNull()
  })

  it('extracts ids from resource urls', () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25)
    expect(idFromUrl('nope')).toBeNull()
  })
})

describe('url state', () => {
  it('round-trips filters through the query string', () => {
    const state = { search: 'char', selectedTypes: ['fire', 'water'], page: 2, pageSize: 50, favoritesOnly: true }
    expect(parseQuery(buildQuery(state))).toEqual(state)
  })

  it('omits defaults and rejects invalid values', () => {
    expect(buildQuery({ search: '', selectedTypes: [], page: 1, pageSize: 20, favoritesOnly: false })).toBe('')
    expect(parseQuery('?page=-1&size=13')).toEqual({})
  })
})

describe('storage', () => {
  it('falls back gracefully when the backend is broken', () => {
    const storage = createStorage({
      getItem: () => '{not json',
      setItem: () => { throw new Error('quota exceeded') }
    })
    expect(storage.get('x', 'fallback')).toBe('fallback')
    expect(() => storage.set('x', 1)).not.toThrow()
  })
})
