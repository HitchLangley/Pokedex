import { createContext, useContext } from 'react'
import { reaction } from 'mobx'
import { api as defaultApi } from '../api/pokeapi'
import { createBackend } from '../api/backend'
import { createStorage } from '../utils/storage'
import { parseQuery } from '../utils/urlState'
import { AuthStore } from './AuthStore'
import { FavoritesStore } from './FavoritesStore'
import { PokedexStore } from './PokedexStore'
import { UiStore } from './UiStore'

export class RootStore {
  constructor ({
    api = defaultApi,
    backend = createBackend(),
    storage = createStorage(),
    location = globalThis.location,
    history = globalThis.history,
    prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  } = {}) {
    this.auth = new AuthStore({ backend })
    this.favorites = new FavoritesStore({ storage, backend })
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
      // keep the address bar in sync with the filters (only on the main list page)
      reaction(
        () => this.pokedex.query,
        (query) => {
          if (!history || !location || !isHomePath(location.pathname)) return
          history.replaceState(history.state, '', `${location.pathname}${query}${location.hash}`)
        },
        { delay: 300 }
      ),
      // favourites follow the signed-in user
      reaction(
        () => this.auth.user?.id ?? null,
        (userId) => (userId ? this.favorites.attach() : this.favorites.detach())
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

function isHomePath (pathname) {
  const base = import.meta.env.BASE_URL || '/'
  return pathname === base || `${pathname}/` === base
}

export const StoreContext = createContext(null)

export function useStores () {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStores must be used inside <StoreContext.Provider>')
  return store
}
