import { describe, expect, it } from 'vitest'
import { when } from 'mobx'
import { FavoritesStore } from './FavoritesStore'
import { PokedexStore } from './PokedexStore'
import { createFakeApi, flush, memoryStorage } from '../test/fixtures'

async function setup ({ initialState, stored } = {}) {
  const { storage, data } = memoryStorage(stored)
  const api = createFakeApi()
  const favorites = new FavoritesStore({ storage })
  const store = new PokedexStore({ api, favorites, storage, initialState })
  await store.init()
  return { store, api, favorites, data }
}

const names = (list) => list.map((p) => p.name)

describe('PokedexStore', () => {
  it('loads the index and the list of types', async () => {
    const { store } = await setup()
    expect(store.status).toBe('ready')
    expect(store.total).toBe(6)
    expect(store.types).toContain('fire')
  })

  it('reports an error when the index cannot be loaded', async () => {
    const { storage } = memoryStorage()
    const api = { ...createFakeApi(), fetchPokemonIndex: async () => { throw new Error('offline') } }
    const store = new PokedexStore({ api, storage, favorites: new FavoritesStore({ storage }) })
    await store.init()
    expect(store.status).toBe('error')
    expect(store.error).toBe('offline')
  })

  it('filters by name, case-insensitively, and by number', async () => {
    const { store } = await setup()
    store.setSearch('CHAR')
    expect(names(store.filtered)).toEqual(['charmander', 'charizard'])
    store.setSearch('#25')
    expect(names(store.filtered)).toEqual(['pikachu'])
  })

  it('shows pokemon having ANY of the selected types', async () => {
    const { store } = await setup()
    store.toggleType('fire')
    expect(store.typeFilterPending).toBe(true)
    await when(() => !store.typeFilterPending)
    store.toggleType('water')
    await when(() => !store.typeFilterPending)
    expect(names(store.filtered)).toEqual(['charmander', 'charizard', 'squirtle'])

    store.toggleType('fire')
    expect(names(store.filtered)).toEqual(['squirtle'])
  })

  it('combines the type filter with the name search', async () => {
    const { store } = await setup()
    store.toggleType('fire')
    await when(() => !store.typeFilterPending)
    store.setSearch('zard')
    expect(names(store.filtered)).toEqual(['charizard'])
  })

  it('does not request the same type twice', async () => {
    const { store, api } = await setup()
    store.toggleType('fire')
    await flush()
    store.toggleType('fire')
    store.toggleType('fire')
    await flush()
    expect(api.calls.filter((c) => c === 'type:fire')).toHaveLength(1)
  })

  it('paginates and keeps the first visible item when changing page size', async () => {
    const { store, data } = await setup({ initialState: { pageSize: 10 } })
    store.setPage(1, 20)
    expect(store.pageSize).toBe(20)
    expect(JSON.parse(data.get('pokedex:pageSize'))).toBe(20)

    store.pageSize = 10
    store.index = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `p${i + 1}` }))
    store.setPage(3)
    expect(store.pageItems[0].name).toBe('p21')
    store.setPage(3, 20) // item #21 lives on page 2 when showing 20 per page
    expect(store.currentPage).toBe(2)
    expect(store.pageItems[0].name).toBe('p21')
    store.setPage(1, 50)
    expect(store.pageItems).toHaveLength(45)
  })

  it('ignores page sizes outside of 10 / 20 / 50', async () => {
    const { store } = await setup()
    store.setPage(1, 13)
    expect(store.pageSize).toBe(20)
  })

  it('resets to the first page when filters change and clamps out-of-range pages', async () => {
    const { store } = await setup({ initialState: { pageSize: 10 } })
    store.index = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `p${i + 1}` }))
    store.setPage(3)
    store.setSearch('p1')
    expect(store.page).toBe(1)

    store.page = 99
    expect(store.currentPage).toBe(store.pageCount)
  })

  it('filters favourites only', async () => {
    const { store, favorites } = await setup()
    favorites.toggle('pikachu')
    favorites.toggle('mewtwo')
    store.setFavoritesOnly(true)
    expect(names(store.filtered)).toEqual(['pikachu', 'mewtwo'])
    favorites.toggle('pikachu')
    expect(names(store.filtered)).toEqual(['mewtwo'])
  })

  it('clears all filters at once', async () => {
    const { store } = await setup()
    store.setSearch('x')
    store.toggleType('fire')
    store.setFavoritesOnly(true)
    expect(store.hasFilters).toBe(true)
    store.clearFilters()
    expect(store.hasFilters).toBe(false)
    expect(store.total).toBe(6)
  })

  it('loads types restored from the URL after init', async () => {
    const { store } = await setup({ initialState: { selectedTypes: ['water'] } })
    await when(() => !store.typeFilterPending)
    expect(names(store.filtered)).toEqual(['squirtle'])
  })

  it('loads and caches details, recording failures', async () => {
    const { store, api } = await setup()
    const pikachu = await store.loadDetails('pikachu')
    expect(pikachu.types).toEqual(['electric'])
    await store.loadDetails('pikachu')
    expect(api.calls.filter((c) => c === 'pokemon:pikachu')).toHaveLength(1)

    await store.loadDetails('missingno')
    expect(store.detailErrors.get('missingno')).toBe('not found')
  })
})
