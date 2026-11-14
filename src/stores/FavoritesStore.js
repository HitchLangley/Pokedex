import { makeAutoObservable, observable } from 'mobx'

const KEY = 'favorites'

export class FavoritesStore {
  names = observable.set()

  constructor ({ storage }) {
    this.storage = storage
    makeAutoObservable(this, { storage: false }, { autoBind: true })
    this.names.replace(storage.get(KEY, []))
  }

  get count () {
    return this.names.size
  }

  has (name) {
    return this.names.has(name)
  }

  toggle (name) {
    if (this.names.has(name)) this.names.delete(name)
    else this.names.add(name)
    this.storage.set(KEY, [...this.names])
  }
}
