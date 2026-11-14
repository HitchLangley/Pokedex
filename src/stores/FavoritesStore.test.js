import { describe, expect, it } from 'vitest'
import { FavoritesStore } from './FavoritesStore'
import { memoryStorage } from '../test/fixtures'

describe('FavoritesStore', () => {
  it('toggles favourites and persists them', () => {
    const { storage, data } = memoryStorage()
    const favorites = new FavoritesStore({ storage })
    favorites.toggle('pikachu')
    favorites.toggle('eevee')
    favorites.toggle('pikachu')

    expect(favorites.has('eevee')).toBe(true)
    expect(favorites.has('pikachu')).toBe(false)
    expect(favorites.count).toBe(1)
    expect(JSON.parse(data.get('pokedex:favorites'))).toEqual(['eevee'])
  })

  it('restores favourites from storage', () => {
    const { storage } = memoryStorage({ favorites: ['mew'] })
    expect(new FavoritesStore({ storage }).has('mew')).toBe(true)
  })
})
