import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { RootStore, StoreContext } from './stores/RootStore'
import { createFakeApi, memoryStorage } from './test/fixtures'

function renderApp () {
  const { storage } = memoryStorage()
  const store = new RootStore({ api: createFakeApi(), storage, location: null, history: null, prefersDark: false })
  render(
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>
  )
  return store
}

const cardNames = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('App', () => {
  it('renders pokemon cards with their types', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument()
    const card = screen.getByRole('article', { name: 'Charizard' })
    expect(await within(card).findByText('Flying')).toBeInTheDocument()
  })

  it('filters by search and by type tags', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('heading', { name: 'Bulbasaur' })

    await user.type(screen.getByRole('searchbox'), 'char')
    expect(cardNames()).toEqual(['Charmander', 'Charizard'])

    await user.clear(screen.getByRole('searchbox'))
    const types = screen.getByRole('group', { name: 'Filter by type' })
    await user.click(within(types).getByText('Water'))
    await user.click(within(types).getByText('Electric'))
    await waitFor(() => expect(cardNames()).toEqual(['Squirtle', 'Pikachu']))
  })

  it('stars a pokemon and shows it in favourites', async () => {
    const user = userEvent.setup()
    const store = renderApp()
    await screen.findByRole('heading', { name: 'Pikachu' })

    await user.click(screen.getByRole('button', { name: 'Add Pikachu to favourites' }))
    expect(store.favorites.has('pikachu')).toBe(true)

    await user.click(screen.getByText('Favourites'))
    await waitFor(() => expect(cardNames()).toEqual(['Pikachu']))
  })

  it('opens the details dialog', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('article', { name: 'Mewtwo' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Mewtwo' })).toBeInTheDocument()
    expect(within(dialog).getByText('Overgrow')).toBeInTheDocument()
  })
})
