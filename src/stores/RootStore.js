import { createContext, useContext } from 'react'
import { reaction } from 'mobx'
import { api as defaultApi } from '../api/pokeapi'
import { createStorage } from '../utils/storage'
import { buildQuery, parseQuery } from '../utils/urlState'
import { FavoritesStore } from './FavoritesStore'
import { PokedexStore } from './PokedexStore'
import { UiStore } from './UiStore'

export class RootStore {
  constructor ({
    api = defaultApi,
    storage = createStorage(),
    location = globalThis.location,
    history = globalThis.history,
    prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  } = {}) {
    this.favorites = new FavoritesStore({ storage })
    this.ui = new UiStore({ storage, prefersDark, location, history })
    this.pokedex = new PokedexStore({
      api,
      storage,
      favorites: this.favorites,
      initialState: location ? parseQuery(location.search) : {}
    })

    this.disposers = [
      // fetch details only for what is currently on screen
      reaction(
        () => this.pokedex.pageItems.map(({ name }) => name),
        () => this.pokedex.loadPageDetails(),
        { fireImmediately: true }
      ),
      // keep the address bar in sync with the filters
      reaction(
        () => buildQuery({
          search: this.pokedex.search.trim(),
          selectedTypes: this.pokedex.selectedTypes,
          page: this.pokedex.currentPage,
          pageSize: this.pokedex.pageSize,
          favoritesOnly: this.pokedex.favoritesOnly
        }),
        (query) => {
          if (!history || !location) return
          history.replaceState(null, '', `${location.pathname}${query}${location.hash}`)
        },
        { delay: 300 }
      )
    ]

    if (globalThis.addEventListener && history) {
      const onPopState = () => this.ui.syncFromLocation()
      globalThis.addEventListener('popstate', onPopState)
      this.disposers.push(() => globalThis.removeEventListener('popstate', onPopState))
    }
  }

  dispose () {
    this.disposers.forEach((dispose) => dispose())
  }
}

export const StoreContext = createContext(null)

export function useStores () {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStores must be used inside <StoreContext.Provider>')
  return store
}
