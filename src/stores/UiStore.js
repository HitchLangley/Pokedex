import { makeAutoObservable } from 'mobx'

export class UiStore {
  dark = false
  selectedPokemon = null

  constructor ({ storage, prefersDark = false }) {
    this.storage = storage
    this.dark = storage.get('dark', prefersDark)
    makeAutoObservable(this, { storage: false })
  }

  toggleDark () {
    this.dark = !this.dark
    this.storage.set('dark', this.dark)
  }

  openPokemon (name) {
    this.selectedPokemon = name
  }

  closePokemon () {
    this.selectedPokemon = null
  }
}
