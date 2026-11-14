import { makeAutoObservable } from 'mobx'

export class AuthStore {
  status = 'idle' // idle | loading | ready | unavailable (static build or API down)
  user = null
  providers = { github: false, dev: false }

  constructor ({ backend }) {
    this.backend = backend
    makeAutoObservable(this, { backend: false }, { autoBind: true })
  }

  get available () {
    return this.status === 'ready'
  }

  get signedIn () {
    return Boolean(this.user)
  }

  * init () {
    if (!this.backend.enabled) {
      this.status = 'unavailable'
      return
    }
    if (this.status !== 'idle') return
    this.status = 'loading'
    try {
      const { user, providers } = yield this.backend.me()
      this.user = user
      this.providers = providers
      this.status = 'ready'
    } catch {
      this.status = 'unavailable'
    }
  }

  loginUrl (provider, returnTo) {
    return this.backend.loginUrl(provider, returnTo)
  }

  * logout () {
    yield this.backend.logout()
    this.user = null
  }
}
