import { existsSync } from 'node:fs'
import { join } from 'node:path'
import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  createSessions,
  fetchGithubProfile,
  githubAuthorizeUrl,
  randomState,
  safeReturnTo
} from './auth.js'
import { githubEnabled } from './config.js'

const POKEMON_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/
const MAX_IMPORT = 2000

export function createApp ({ db, config, fetchFn = fetch, logger = console }) {
  const app = express()
  const sessions = createSessions(config.sessionSecret)
  const secure = config.publicUrl.startsWith('https://')
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure, path: '/' }
  const redirectUri = `${config.publicUrl}/api/auth/github/callback`

  app.set('trust proxy', 1) // behind Render / other proxies: needed for secure cookies
  app.disable('x-powered-by')
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'https://raw.githubusercontent.com', 'https://avatars.githubusercontent.com'],
        'connect-src': ["'self'", 'https://pokeapi.co'],
        'media-src': ["'self'", 'https://raw.githubusercontent.com'],
        'style-src': ["'self'", "'unsafe-inline'"] // antd injects its styles at runtime
      }
    },
    crossOriginEmbedderPolicy: false
  }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  const api = express.Router()

  // ---- session ---------------------------------------------------------------

  api.use(async (req, res, next) => {
    try {
      const userId = await sessions.verify(req.cookies[SESSION_COOKIE])
      req.user = userId ? await db.findUser(userId) : null
      next()
    } catch (err) {
      next(err)
    }
  })

  // Cookies are SameSite=Lax, so other sites can't send them with POST/PUT/DELETE.
  // Requiring a custom header on top of that blocks old-browser and form-based CSRF.
  api.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.get('X-Requested-With') === 'fetch') return next()
    res.status(403).json({ error: 'Missing X-Requested-With header' })
  })

  const requireUser = (req, res, next) => {
    if (req.user) return next()
    res.status(401).json({ error: 'Not signed in' })
  }

  async function startSession (res, user, returnTo) {
    res.cookie(SESSION_COOKIE, await sessions.sign(user.id), { ...cookieOptions, maxAge: sessions.maxAge })
    res.redirect(safeReturnTo(returnTo))
  }

  // ---- routes ----------------------------------------------------------------

  api.get('/health', (req, res) => res.json({ ok: true }))

  api.get('/me', (req, res) => {
    res.json({
      user: req.user,
      providers: { github: githubEnabled(config), dev: config.devLogin }
    })
  })

  api.get('/auth/github', (req, res) => {
    if (!githubEnabled(config)) return res.status(503).json({ error: 'GitHub login is not configured' })
    const state = randomState()
    const returnTo = safeReturnTo(req.query.returnTo)
    res.cookie(STATE_COOKIE, JSON.stringify({ state, returnTo }), { ...cookieOptions, maxAge: 10 * 60 * 1000 })
    res.redirect(githubAuthorizeUrl({ clientId: config.github.clientId, redirectUri, state }))
  })

  api.get('/auth/github/callback', async (req, res) => {
    let saved = {}
    try { saved = JSON.parse(req.cookies[STATE_COOKIE] || '{}') } catch {}
    res.clearCookie(STATE_COOKIE, cookieOptions)

    if (req.query.error) return res.redirect('/?login=cancelled')
    if (!req.query.code || !saved.state || saved.state !== req.query.state) {
      return res.redirect('/?login=failed')
    }

    try {
      const profile = await fetchGithubProfile({
        code: String(req.query.code),
        clientId: config.github.clientId,
        clientSecret: config.github.clientSecret,
        redirectUri,
        fetchFn
      })
      const user = await db.upsertUser(profile)
      await startSession(res, user, saved.returnTo)
    } catch (err) {
      logger.error(err)
      res.redirect('/?login=failed')
    }
  })

  if (config.devLogin) {
    api.get('/auth/dev', async (req, res) => {
      const { login: requested } = req.query
      const login = typeof requested === 'string' && /^[a-z0-9-]{1,39}$/i.test(requested) ? requested : 'ash'
      const user = await db.upsertUser({
        provider: 'dev',
        providerId: login,
        login,
        name: `${login} (dev)`,
        avatarUrl: null
      })
      await startSession(res, user, req.query.returnTo)
    })
  }

  api.post('/auth/logout', (req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions)
    res.status(204).end()
  })

  api.get('/favorites', requireUser, async (req, res) => {
    res.json({ favorites: await db.listFavorites(req.user.id) })
  })

  api.put('/favorites/:name', requireUser, async (req, res) => {
    const { name } = req.params
    if (!POKEMON_NAME.test(name)) return res.status(400).json({ error: 'Invalid pokemon name' })
    await db.addFavorites(req.user.id, [name])
    res.status(204).end()
  })

  api.delete('/favorites/:name', requireUser, async (req, res) => {
    await db.removeFavorite(req.user.id, req.params.name)
    res.status(204).end()
  })

  // merges favourites collected before signing in
  api.post('/favorites/import', requireUser, async (req, res) => {
    const names = req.body?.names
    if (!Array.isArray(names) || names.length > MAX_IMPORT || !names.every((n) => typeof n === 'string' && POKEMON_NAME.test(n))) {
      return res.status(400).json({ error: `Expected { names: string[] } with at most ${MAX_IMPORT} valid names` })
    }
    await db.addFavorites(req.user.id, [...new Set(names)])
    res.json({ favorites: await db.listFavorites(req.user.id) })
  })

  api.use((req, res) => res.status(404).json({ error: 'Not found' }))

  app.use('/api', api)

  // ---- front-end -------------------------------------------------------------

  if (existsSync(join(config.staticDir, 'index.html'))) {
    app.use(express.static(config.staticDir, { index: false, maxAge: '1y', immutable: true }))
    // client-side routes (/profile, ...) all get the SPA shell
    app.get('/{*path}', (req, res) => {
      res.set('Cache-Control', 'no-cache')
      res.sendFile(join(config.staticDir, 'index.html'))
    })
  }

  app.use((err, req, res, next) => {
    logger.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
