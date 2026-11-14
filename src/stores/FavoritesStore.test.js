import { describe, expect, it } from 'vitest'
import { FavoritesStore } from './FavoritesStore'
import { createFakeBackend, memoryStorage } from '../test/fixtures'

describe('FavoritesStore', () => {
  describe('signed out', () => {
    it('toggles favourites and persists them locally', () => {
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

    it('restores favourites from storage and ignores garbage', () => {
      expect(new FavoritesStore({ storage: memoryStorage({ favorites: ['mew'] }).storage }).has('mew')).toBe(true)
      expect(new FavoritesStore({ storage: memoryStorage({ favorites: 'oops' }).storage }).count).toBe(0)
    })
  })

  describe('signed in', () => {
    it('merges local favourites into the account and clears local storage', async () => {
      const { storage, data } = memoryStorage({ favorites: ['eevee'] })
      const backend = createFakeBackend({ favorites: ['mew'] })
      const favorites = new FavoritesStore({ storage, backend })

      await favorites.attach()
      expect(favorites.list).toEqual(['mew', 'eevee'])
      expect(backend.state.favorites).toEqual(['mew', 'eevee'])
      expect(JSON.parse(data.get('pokedex:favorites'))).toEqual([])
    })

    it('saves toggles to the server', async () => {
      const { storage, data } = memoryStorage()
      const backend = createFakeBackend()
      const favorites = new FavoritesStore({ storage, backend })
      await favorites.attach()

      await favorites.toggle('pikachu')
      expect(backend.state.favorites).toEqual(['pikachu'])
      await favorites.toggle('pikachu')
      expect(backend.state.favorites).toEqual([])
      expect(data.get('pokedex:favorites')).toBeUndefined() // nothing written locally
    })

    it('rolls back and reports an error when the server fails', async () => {
      const { storage } = memoryStorage()
      const backend = createFakeBackend({ failWrites: true })
      const favorites = new FavoritesStore({ storage, backend })
      await favorites.attach()

      const pending = favorites.toggle('pikachu')
      expect(favorites.has('pikachu')).toBe(true) // optimistic
      await pending
      expect(favorites.has('pikachu')).toBe(false)
      expect(favorites.error).toMatch(/server down/)
    })

    it('goes back to local favourites on sign out', async () => {
      const { storage } = memoryStorage()
      const favorites = new FavoritesStore({ storage, backend: createFakeBackend({ favorites: ['mew'] }) })
      await favorites.attach()
      favorites.detach()
      expect(favorites.count).toBe(0)
    })
  })
})
