import { describe, expect, it } from 'vitest'
import { UiStore } from './UiStore'
import { memoryStorage } from '../test/fixtures'

// Minimal in-memory browser history: back() moves the pointer and notifies like popstate does
function fakeBrowser (initialHash = '') {
  const entries = [`/pokedex/?q=char${initialHash}`]
  let index = 0
  const location = {}
  const listeners = []
  const sync = () => {
    const url = new URL(entries[index], 'http://test')
    Object.assign(location, { pathname: url.pathname, search: url.search, hash: url.hash })
  }
  sync()
  const history = {
    pushState (_, __, url) { entries.splice(index + 1, Infinity, url); index++; sync() },
    replaceState (_, __, url) { entries[index] = url; sync() },
    back () { if (index > 0) { index--; sync(); listeners.forEach((fn) => fn()) } },
    get length () { return entries.length }
  }
  return { location, history, onPop: (fn) => listeners.push(fn), entries: () => entries.slice(0, index + 1) }
}

function setup (hash) {
  const browser = fakeBrowser(hash)
  const { storage } = memoryStorage()
  const ui = new UiStore({ storage, location: browser.location, history: browser.history })
  browser.onPop(() => ui.syncFromLocation())
  return { ui, browser }
}

describe('UiStore', () => {
  it('methods work when passed around as callbacks', () => {
    const { ui } = setup()
    const { openPokemon, closePokemon, toggleDark } = ui
    openPokemon('pikachu')
    expect(ui.selectedPokemon).toBe('pikachu')
    closePokemon()
    expect(ui.selectedPokemon).toBeNull()
    toggleDark()
    expect(ui.dark).toBe(true)
  })

  it('puts the opened pokemon in the URL and removes it on close', () => {
    const { ui, browser } = setup()
    ui.openPokemon('pikachu')
    expect(browser.location.hash).toBe('#pikachu')
    expect(browser.location.search).toBe('?q=char') // filters are kept
    ui.closePokemon()
    expect(browser.location.hash).toBe('')
    expect(browser.entries()).toHaveLength(1) // no leftover history entry
  })

  it('closes the dialog with the browser back button', () => {
    const { ui, browser } = setup()
    ui.openPokemon('pikachu')
    browser.history.back()
    expect(ui.selectedPokemon).toBeNull()
  })

  it('replaces the history entry when navigating inside the dialog', () => {
    const { ui, browser } = setup()
    ui.openPokemon('pikachu')
    ui.openPokemon('raichu')
    expect(browser.entries()).toHaveLength(2)
    browser.history.back()
    expect(ui.selectedPokemon).toBeNull()
  })

  it('opens a pokemon from a direct link and closes it without leaving the site', () => {
    const { ui, browser } = setup('#mew')
    expect(ui.selectedPokemon).toBe('mew')
    ui.closePokemon()
    expect(ui.selectedPokemon).toBeNull()
    expect(browser.location.hash).toBe('')
    expect(browser.entries()).toHaveLength(1)
  })
})
