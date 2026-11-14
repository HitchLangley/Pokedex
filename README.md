# Pokédex

A small, responsive pokédex built on top of the open [PokéAPI](https://pokeapi.co/) — the front-end variant of the Decision Mapper test task.

**Live demo:** deployed to GitHub Pages by the workflow in `.github/workflows/deploy.yml` (see the repository's *Environments → github-pages* link).

## Features

Required:

- Pokémon shown as cards with avatar, name, number, colour-coded **type tags** and all six base stats
- **Pagination** with 10 / 20 / 50 items per page
- **Search** by name (also accepts a pokédex number, e.g. `25` or `#25`)
- **Type filter** with tags — selecting several types shows pokémon having *any* of them
- Responsive layout from 320 px phones to wide desktops

Extras:

- ⭐ **Favourites** — star any pokémon; a separate *Favourites* view; persisted in `localStorage`
- **Details dialog** — large artwork, species description, height/weight, abilities, full stats with total, the pokémon's cry; ← / → keys or buttons go through the current filtered list
- **Shareable URLs** — search, types, page, page size and the favourites view are kept in the query string
- **Dark mode** (follows the OS setting by default, toggle in the header)
- CSS animations: staggered card entrance, animated stat bars, floating artwork, star "pop"; all disabled for `prefers-reduced-motion`
- Loading skeletons, empty states and retry on network errors

## Stack

| Requirement in the task | Used here |
| --- | --- |
| React + MobX (ES6) | React 19, MobX 7 + `mobx-react-lite` |
| UI library (Material UI / ant.design) | Ant Design 6 |
| eslint standard config | [`neostandard`](https://github.com/neostandard/neostandard) — the maintained flat-config successor of `eslint-config-standard` |
| CSS preprocessor (bonus) | SCSS |
| Webpack (bonus) | Vite — today's default build tool for React |
| Unit tests (bonus) | Vitest + Testing Library |
| Deployment | GitHub Pages via GitHub Actions |

## How it works

PokéAPI has no server-side search or type filter, so the app:

1. loads the lightweight index of all pokémon (`/pokemon?limit=…`, names + ids only) and the list of types once;
2. filters and paginates that index on the client — instant, no extra requests;
3. when a type tag is selected, fetches that type's member list once (`/type/{name}`) and caches it;
4. fetches full details only for the pokémon visible on the current page.

All requests go through a small cache that also de-duplicates concurrent requests.

```
src/
  api/pokeapi.js          fetch + cache, typed helpers for the endpoints used
  stores/
    PokedexStore.js       index, filters, pagination, details cache (computed filtered/page lists)
    FavoritesStore.js     starred pokémon, persisted
    UiStore.js            theme and the opened details dialog
    RootStore.js          wires stores together, reactions (page details loading, URL sync), React context
  components/             observer components (Toolbar, PokemonList, PokemonCard, PokemonModal, …)
  utils/                  formatting / normalisation, URL state, safe localStorage
  styles/                 SCSS: variables & mixins, components, animations
```

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # eslint (neostandard)
npm test           # unit + component tests
npm run build      # production build into dist/
```

## Deployment

Pushing to `main` runs lint, tests and the build, then publishes `dist/` to GitHub Pages.
One-time setup: *Settings → Pages → Build and deployment → Source: GitHub Actions*.

## What could come next

- Full-stack variant: Node.js API with social login (e.g. GitHub/Google OAuth) and favourites stored per user
- Sorting (by number, name, total stats) — needs details for the whole filtered list, so best done server-side
- Evolution chains in the details dialog, i18n using PokéAPI's localised names
