import { makeAutoObservable } from 'mobx'

// The opened pokemon is reflected in the URL hash (#pikachu), so the browser / phone
// "back" button closes the dialog and a pokemon can be linked to directly.
export class UiStore {
  dark = false
  selectedPokemon = null

  constructor ({ storage, prefersDark = false, location = null, history = null }) {
    this.storage = storage
    this.location = location
    this.history = history
    // true while the dialog's history entry was pushed by us and can be popped with history.back()
    this.ownsHistoryEntry = false
    this.dark = storage.get('dark', prefersDark)
    this.selectedPokemon = this.nameFromHash()
    makeAutoObservable(this, { storage: false, location: false, history: false, ownsHistoryEntry: false }, { autoBind: true })
  }

  toggleDark () {
    this.dark = !this.dark
    this.storage.set('dark', this.dark)
  }

  openPokemon (name) {
    const alreadyOpen = Boolean(this.selectedPokemon)
    this.selectedPokemon = name
    if (alreadyOpen) {
      this.writeHash(name, 'replace') // prev / next inside the dialog shouldn't flood the history
    } else {
      this.writeHash(name, 'push')
      this.ownsHistoryEntry = Boolean(this.history)
    }
  }

  closePokemon () {
    if (!this.selectedPokemon) return
    this.selectedPokemon = null
    if (this.ownsHistoryEntry) {
      this.ownsHistoryEntry = false
      this.history.back()
    } else {
      this.writeHash(null, 'replace')
    }
  }

  // called on popstate (back / forward buttons)
  syncFromLocation () {
    this.selectedPokemon = this.nameFromHash()
    if (!this.selectedPokemon) this.ownsHistoryEntry = false
  }

  nameFromHash () {
    const hash = this.location?.hash?.replace(/^#/, '') ?? ''
    return /^[a-z0-9-]+$/.test(hash) ? hash : null
  }

  writeHash (name, mode) {
    if (!this.history || !this.location) return
    const url = `${this.location.pathname}${this.location.search}${name ? `#${name}` : ''}`
    if (mode === 'push') this.history.pushState(null, '', url)
    else this.history.replaceState(null, '', url)
  }
}
