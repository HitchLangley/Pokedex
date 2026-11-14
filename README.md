# Pokédex

A responsive pokédex built on top of the open [PokéAPI](https://pokeapi.co/) — the **full-stack** variant of the Decision Mapper test task: React + MobX front-end and a Node.js API with GitHub sign-in and per-user favourites.

**Live demo**

- Front-end only (GitHub Pages, favourites kept in the browser): https://hitchlangley.github.io/Pokedex/
- Full stack (Render, sign in with GitHub): see [Deployment](#deployment)

## Features

Front-end requirements:

- Pokémon shown as cards with avatar, name, number, colour-coded **type tags** and all six base stats
- **Pagination** with 10 / 20 / 50 items per page
- **Search** by name (also accepts a pokédex number, e.g. `25` or `#25`)
- **Type filter** with tags — selecting several types shows pokémon having *any* of them
- Responsive layout from 320 px phones to wide desktops

Full-stack requirements:

- **User accounts with social login** — *Sign in with GitHub* (OAuth 2.0)
- **Profile page** (`/profile`) with the user's favourite pokémon; every card has a ⭐ to add / remove it
- Favourites are stored per user in Postgres; anything starred before signing in is merged into the account

Extras:

- **Details dialog** — large artwork, species description, height/weight, abilities, full stats with total, the pokémon's cry; ← / → go through the current list; the browser *back* button closes it and `#pikachu` links open a pokémon directly
- **Profile stats** — type breakdown of your favourites and your strongest pokémon
- **Shareable URLs** — search, types, page, page size and the favourites view live in the query string
- **Dark mode** (follows the OS setting, toggle in the header)
- CSS animations: staggered card entrance, animated stat bars, floating artwork, star "pop"; disabled for `prefers-reduced-motion`
- Loading skeletons, empty states, optimistic favourites with rollback, retry on network errors

## Stack

| Requirement in the task | Used here |
| --- | --- |
| React + MobX (ES6) | React 19, MobX 7 + `mobx-react-lite`, React Router |
| UI library (Material UI / ant.design) | Ant Design 6 |
| Server in Node.js | Node 22 + Express 5, Postgres (`pg`), [PGlite](https://pglite.dev) for local dev & tests |
| Social login | GitHub OAuth, session in a signed `HttpOnly` cookie (JWT via `jose`) |
| eslint standard config | [`neostandard`](https://github.com/neostandard/neostandard) — the maintained flat-config successor of `eslint-config-standard` |
| CSS preprocessor (bonus) | SCSS |
| Webpack (bonus) | Vite — today's default build tool for React |
| Unit tests (bonus) | Vitest, Testing Library, Supertest |
| Deployment | Render (full stack, `render.yaml`) and GitHub Pages (static front-end) via GitHub Actions |

## How it works

**Front-end.** PokéAPI has no server-side search or type filter, so the app loads the lightweight index of all pokémon (names + ids) once, filters and paginates it on the client, fetches a type's member list when its tag is selected, and loads full details only for the pokémon on screen. All PokéAPI requests go through a cache that also de-duplicates concurrent requests.

**Back-end.** The Express server serves the built front-end and a small JSON API. Postgres has two tables, `users` and `favorites`; the same SQL runs on embedded PGlite locally, so no database setup is needed for development.

| Method | Path | |
| --- | --- | --- |
| GET | `/api/me` | current user (or `null`) and enabled login providers |
| GET | `/api/auth/github` | starts the OAuth flow (`?returnTo=/profile`) |
| GET | `/api/auth/github/callback` | OAuth callback: verifies `state`, creates/updates the user, sets the session cookie |
| POST | `/api/auth/logout` | clears the session |
| GET | `/api/favorites` | the user's favourites |
| PUT / DELETE | `/api/favorites/:name` | add / remove one |
| POST | `/api/favorites/import` | merge favourites collected before signing in |

Security: OAuth `state` check, `HttpOnly` + `SameSite=Lax` (+ `Secure` in production) session cookie, a required `X-Requested-With` header on writes against CSRF, input validation, same-site-only redirects after login, Helmet security headers with a CSP.

```
server/
  index.js            entry point
  app.js              Express app: auth routes, favourites API, static front-end
  auth.js             sessions (JWT), GitHub OAuth helpers
  db.js               schema + queries, Postgres or PGlite
  config.js           environment variables
src/
  api/                PokéAPI client (cached) and our backend client
  stores/             MobX stores: Pokedex, Favorites (local ↔ server), Auth, Ui, Root (reactions, context)
  pages/              HomePage, ProfilePage
  components/         observer components (Toolbar, PokemonList, PokemonCard, PokemonModal, AccountMenu, …)
  utils/              formatting / normalisation, URL state, safe localStorage
  styles/             SCSS: variables & mixins, components, animations
```

## Getting started

Requires Node.js 22+.

```bash
npm install
npm run dev        # API on :3000 + Vite on http://localhost:5173
```

That's all — locally the server uses an embedded database in `.data/` and offers a **dev sign-in** so you can try accounts without an OAuth app. To test real GitHub login, copy `.env.example` to `.env` and fill in `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (callback URL `http://localhost:5173/api/auth/github/callback`).

```bash
npm run lint       # eslint (neostandard)
npm test           # unit, component and API tests
npm run build      # production build of the front-end into dist/
npm start          # serve API + dist/ (production mode needs the env vars below)
```

## Deployment

### Full stack on Render (free)

1. **Database** — create a free Postgres at [neon.tech](https://neon.tech) and copy its connection string.
2. **Render** — *New → Blueprint*, choose this repository. `render.yaml` describes the service; Render asks for:
   - `DATABASE_URL` — the Neon connection string
   - `PUBLIC_URL` — the service address, e.g. `https://pokedex-xxxx.onrender.com` (shown after the first deploy; set it then)
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — from step 3
3. **GitHub OAuth app** — [github.com/settings/developers](https://github.com/settings/developers) → *New OAuth App*:
   - Homepage URL: your `PUBLIC_URL`
   - Authorization callback URL: `<PUBLIC_URL>/api/auth/github/callback`

The schema is created automatically on start. Free Render services sleep when idle, so the first request after a while takes ~30 s.

### Front-end on GitHub Pages

Every push to `main` runs lint, tests and a static build (`VITE_STATIC=1`, no accounts) and publishes it to GitHub Pages.
One-time setup: *Settings → Pages → Source: GitHub Actions*.

## What could come next

- More login providers (Google, Facebook) — the `users` table already keys accounts by provider
- Sorting by stats (needs details for the whole list — a good job for the server)
- Evolution chains in the details dialog, i18n using PokéAPI's localised names

## License

[MIT](LICENSE)
