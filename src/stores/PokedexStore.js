import { makeAutoObservable, observable, runInAction } from 'mobx'
import { normalizePokemon } from '../utils/pokemon'
import { PAGE_SIZES } from '../utils/urlState'

export class PokedexStore {
  // full list of { id, name } — small enough (~1300 entries) to filter on the client
  index = []
  types = []
  status = 'idle' // idle | loading | ready | error
  error = null

  search = ''
  selectedTypes = []
  favoritesOnly = false
  page = 1
  pageSize = 20

  // type -> Set of pokemon names; details: name -> normalized pokemon
  typeMembers = observable.map({}, { deep: false })
  typeErrors = observable.map({}, { deep: false })
  details = observable.map({}, { deep: false })
  detailErrors = observable.map({}, { deep: false })

  constructor ({ api, favorites, storage, initialState = {} }) {
    this.api = api
    this.favorites = favorites
    this.storage = storage
    this.pageSize = storage.get('pageSize', this.pageSize)
    Object.assign(this, initialState)
    makeAutoObservable(this, { api: false, favorites: false, storage: false, fetchSpecies: false }, { autoBind: true })
  }

  // ---- derived state -------------------------------------------------------

  get typeFilterPending () {
    return this.selectedTypes.some((type) => !this.typeMembers.has(type) && !this.typeErrors.has(type))
  }

  get filtered () {
    let list = this.index

    const query = this.search.trim().toLowerCase().replace(/^#/, '')
    if (query) {
      const asNumber = /^\d+$/.test(query) ? Number(query) : null
      list = list.filter(({ name, id }) => name.includes(query) || id === asNumber)
    }

    if (this.selectedTypes.length) {
      // multiple selected types => pokemon having ANY of them
      const sets = this.selectedTypes.map((type) => this.typeMembers.get(type)).filter(Boolean)
      list = list.filter(({ name }) => sets.some((set) => set.has(name)))
    }

    if (this.favoritesOnly) {
      list = list.filter(({ name }) => this.favorites.has(name))
    }

    return list
  }

  get total () {
    return this.filtered.length
  }

  get pageCount () {
    return Math.max(1, Math.ceil(this.total / this.pageSize))
  }

  // the stored page may be out of range after the list shrinks (e.g. un-starring)
  get currentPage () {
    return Math.min(this.page, this.pageCount)
  }

  get pageItems () {
    const start = (this.currentPage - 1) * this.pageSize
    return this.filtered.slice(start, start + this.pageSize)
  }

  get hasFilters () {
    return Boolean(this.search.trim() || this.selectedTypes.length || this.favoritesOnly)
  }

  get isListLoading () {
    return this.status === 'loading' || this.typeFilterPending
  }

  // ---- actions -------------------------------------------------------------

  setSearch (value) {
    this.search = value
    this.page = 1
  }

  toggleType (type) {
    this.selectedTypes = this.selectedTypes.includes(type)
      ? this.selectedTypes.filter((t) => t !== type)
      : [...this.selectedTypes, type]
    this.page = 1
    this.loadType(type)
  }

  setFavoritesOnly (value) {
    this.favoritesOnly = value
    this.page = 1
  }

  clearFilters () {
    this.search = ''
    this.selectedTypes = []
    this.favoritesOnly = false
    this.page = 1
  }

  setPage (page, pageSize = this.pageSize) {
    if (PAGE_SIZES.includes(pageSize) && pageSize !== this.pageSize) {
      // keep the first visible pokemon on screen when the page size changes
      const firstIndex = (this.currentPage - 1) * this.pageSize
      this.pageSize = pageSize
      this.page = Math.floor(firstIndex / pageSize) + 1
      this.storage.set('pageSize', pageSize)
      return
    }
    this.page = page
  }

  * init () {
    if (this.status === 'loading' || this.status === 'ready') return
    this.status = 'loading'
    this.error = null
    try {
      const [index, types] = yield Promise.all([this.api.fetchPokemonIndex(), this.api.fetchTypes()])
      this.index = index
      this.types = types
      this.status = 'ready'
      // types restored from the URL still need their member lists
      this.selectedTypes.forEach((type) => this.loadType(type))
    } catch (err) {
      this.status = 'error'
      this.error = err.message
    }
  }

  async loadType (type) {
    if (this.typeMembers.has(type)) return
    runInAction(() => this.typeErrors.delete(type))
    try {
      const names = await this.api.fetchTypeMembers(type)
      runInAction(() => this.typeMembers.set(type, new Set(names)))
    } catch (err) {
      runInAction(() => this.typeErrors.set(type, err.message))
    }
  }

  async loadDetails (name) {
    if (this.details.has(name)) return this.details.get(name)
    runInAction(() => this.detailErrors.delete(name))
    try {
      const raw = await this.api.fetchPokemon(name)
      const pokemon = normalizePokemon(raw)
      runInAction(() => this.details.set(name, pokemon))
      return pokemon
    } catch (err) {
      runInAction(() => this.detailErrors.set(name, err.message))
      return null
    }
  }

  fetchSpecies (url) {
    return this.api.fetchSpecies(url)
  }

  loadPageDetails () {
    this.pageItems.forEach(({ name }) => this.loadDetails(name))
  }
}
