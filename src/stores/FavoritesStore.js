import { makeAutoObservable, observable, runInAction } from 'mobx'

const KEY = 'favorites'

// Signed out: favourites live in localStorage.
// Signed in: they live on the server; anything starred before signing in is merged into the account.
export class FavoritesStore {
  names = observable.set()
  remote = false
  syncing = false
  error = null

  constructor ({ storage, backend = null }) {
    this.storage = storage
    this.backend = backend
    makeAutoObservable(this, { storage: false, backend: false }, { autoBind: true })
    this.setAll(this.readLocal())
  }

  get count () {
    return this.names.size
  }

  get list () {
    return [...this.names]
  }

  has (name) {
    return this.names.has(name)
  }

  async toggle (name) {
    const adding = !this.names.has(name)
    // optimistic update, rolled back if the server says no
    runInAction(() => {
      if (adding) this.names.add(name)
      else this.names.delete(name)
      this.error = null
    })

    if (!this.remote) {
      this.writeLocal()
      return
    }

    try {
      await (adding ? this.backend.addFavorite(name) : this.backend.removeFavorite(name))
    } catch (err) {
      runInAction(() => {
        if (adding) this.names.delete(name)
        else this.names.add(name)
        this.error = `Couldn't update favourites: ${err.message}`
      })
    }
  }

  // called when a user signs in
  async attach () {
    runInAction(() => { this.syncing = true; this.error = null })
    try {
      const local = this.readLocal()
      const names = local.length
        ? await this.backend.importFavorites(local)
        : await this.backend.listFavorites()
      runInAction(() => {
        this.setAll(names)
        this.remote = true
      })
      if (local.length) this.storage.set(KEY, []) // now stored in the account
    } catch (err) {
      runInAction(() => { this.error = `Couldn't load your favourites: ${err.message}` })
    } finally {
      runInAction(() => { this.syncing = false })
    }
  }

  // called on sign out
  detach () {
    this.remote = false
    this.setAll(this.readLocal())
  }

  // keeps the given order (server returns favourites oldest first)
  setAll (names) {
    this.names.clear()
    names.forEach((name) => this.names.add(name))
  }

  readLocal () {
    const value = this.storage.get(KEY, [])
    return Array.isArray(value) ? value.filter((n) => typeof n === 'string') : []
  }

  writeLocal () {
    this.storage.set(KEY, [...this.names])
  }
}
