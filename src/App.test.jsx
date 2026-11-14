import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { App } from './App'
import { RootStore, StoreContext } from './stores/RootStore'
import { TRAINER, createFakeApi, createFakeBackend, memoryStorage } from './test/fixtures'

function renderApp ({ backend = createFakeBackend(), path = '/' } = {}) {
  const { storage } = memoryStorage()
  const store = new RootStore({ api: createFakeApi(), backend, storage, location: null, history: null, prefersDark: false })
  render(
    <StoreContext.Provider value={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
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

  it('opens and closes the details dialog', async () => {
    const user = userEvent.setup()
    const store = renderApp()
    await user.click(await screen.findByRole('article', { name: 'Mewtwo' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Mewtwo' })).toBeInTheDocument()
    expect(within(dialog).getByText('Overgrow')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(store.ui.selectedPokemon).toBeNull())
  })

  it('toggles dark mode', async () => {
    const user = userEvent.setup()
    const store = renderApp()
    await user.click(screen.getByRole('button', { name: 'Toggle dark mode' }))
    expect(store.ui.dark).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('offers to sign in when signed out', async () => {
    renderApp()
    const link = await screen.findByRole('link', { name: /sign in/i })
    expect(link).toHaveAttribute('href', '/api/auth/github?returnTo=%2F')
  })

  it('hides accounts in the static build', async () => {
    renderApp({ backend: createFakeBackend({ enabled: false }) })
    await screen.findByRole('heading', { name: 'Bulbasaur' })
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()
  })

  it('shows the profile with server-side favourites', async () => {
    const backend = createFakeBackend({ user: TRAINER, favorites: ['mewtwo', 'squirtle'] })
    renderApp({ backend, path: '/profile' })

    expect(await screen.findByRole('heading', { name: 'Ash Ketchum' })).toBeInTheDocument()
    await waitFor(() => expect(cardNames()).toEqual(['Mewtwo', 'Squirtle']))
    expect(await screen.findAllByText('Psychic')).toHaveLength(2) // type breakdown + card

    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove Mewtwo from favourites' }))
    await waitFor(() => expect(cardNames()).toEqual(['Squirtle']))
    expect(backend.state.favorites).toEqual(['squirtle'])
  })

  it('asks to sign in on the profile page when signed out', async () => {
    renderApp({ path: '/profile' })
    expect(await screen.findByText('Sign in to see your profile')).toBeInTheDocument()
  })
})
