// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app.js'
import { connect } from './db.js'

const baseConfig = {
  production: false,
  publicUrl: 'http://localhost:5173',
  sessionSecret: 'test-secret-test-secret-test-secret-123',
  github: { clientId: 'client-id', clientSecret: 'client-secret' },
  devLogin: true,
  staticDir: '/nonexistent'
}

const silent = { error () {} }

function fakeGithub ({ id = 42, login = 'misty' } = {}) {
  const calls = []
  const fetchFn = async (url, options = {}) => {
    calls.push({ url, options })
    if (url.startsWith('https://github.com/login/oauth/access_token')) {
      const body = JSON.parse(options.body)
      const ok = body.code === 'good-code'
      return { ok: true, json: async () => (ok ? { access_token: 'token-123' } : { error: 'bad_verification_code' }) }
    }
    if (url === 'https://api.github.com/user') {
      return { ok: true, json: async () => ({ id, login, name: 'Misty', avatar_url: 'https://avatars.githubusercontent.com/u/42' }) }
    }
    throw new Error(`unexpected fetch ${url}`)
  }
  return { fetchFn, calls }
}

let db
beforeAll(async () => { db = await connect({ memory: true }) })
beforeEach(async () => { await db.reset() })
afterAll(async () => { await db.close() })

function setup (config = {}, github = fakeGithub()) {
  const app = createApp({ db, config: { ...baseConfig, ...config }, fetchFn: github.fetchFn, logger: silent })
  return { app, agent: request.agent(app), github }
}

async function signIn (agent, login = 'ash') {
  await agent.get(`/api/auth/dev?login=${login}`).expect(302)
}

const mutate = (req) => req.set('X-Requested-With', 'fetch')

describe('auth', () => {
  it('reports an anonymous session and the available providers', async () => {
    const { agent } = setup()
    const res = await agent.get('/api/me').expect(200)
    expect(res.body).toEqual({ user: null, providers: { github: true, dev: true } })
  })

  it('signs in with GitHub using a state check', async () => {
    const { agent, github } = setup()

    const start = await agent.get('/api/auth/github?returnTo=/profile').expect(302)
    const authorize = new URL(start.headers.location)
    expect(authorize.origin + authorize.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(authorize.searchParams.get('redirect_uri')).toBe('http://localhost:5173/api/auth/github/callback')
    const state = authorize.searchParams.get('state')

    const callback = await agent.get(`/api/auth/github/callback?code=good-code&state=${state}`).expect(302)
    expect(callback.headers.location).toBe('/profile')
    expect(callback.headers['set-cookie'].join(';')).toMatch(/pokedex_session=.+HttpOnly/i)
    expect(github.calls[1].options.headers.Authorization).toBe('Bearer token-123')

    const me = await agent.get('/api/me').expect(200)
    expect(me.body.user).toMatchObject({ login: 'misty', name: 'Misty', provider: 'github' })
  })

  it('rejects a callback with a wrong state', async () => {
    const { agent } = setup()
    await agent.get('/api/auth/github').expect(302)
    const res = await agent.get('/api/auth/github/callback?code=good-code&state=forged').expect(302)
    expect(res.headers.location).toBe('/?login=failed')
    expect((await agent.get('/api/me')).body.user).toBeNull()
  })

  it('handles a failed token exchange', async () => {
    const { agent } = setup()
    const start = await agent.get('/api/auth/github').expect(302)
    const state = new URL(start.headers.location).searchParams.get('state')
    const res = await agent.get(`/api/auth/github/callback?code=bad&state=${state}`).expect(302)
    expect(res.headers.location).toBe('/?login=failed')
  })

  it('never redirects to another site after login', async () => {
    const { agent } = setup()
    const res = await agent.get('/api/auth/dev?returnTo=//evil.example').expect(302)
    expect(res.headers.location).toBe('/')
  })

  it('keeps the same user across logins and updates the profile', async () => {
    const { agent } = setup()
    for (const login of ['misty', 'misty-renamed']) {
      const github = fakeGithub({ id: 7, login })
      const app = createApp({ db, config: baseConfig, fetchFn: github.fetchFn, logger: silent })
      const a = request.agent(app)
      const start = await a.get('/api/auth/github').expect(302)
      await a.get(`/api/auth/github/callback?code=good-code&state=${new URL(start.headers.location).searchParams.get('state')}`)
      const me = await a.get('/api/me')
      expect(me.body.user).toMatchObject({ id: 1, login })
    }
    expect((await agent.get('/api/me')).body.user).toBeNull()
  })

  it('returns 503 when GitHub is not configured and hides dev login in production mode', async () => {
    const { agent } = setup({ github: {}, devLogin: false })
    await agent.get('/api/auth/github').expect(503)
    await agent.get('/api/auth/dev').expect(404)
  })

  it('logs out', async () => {
    const { agent } = setup()
    await signIn(agent)
    await mutate(agent.post('/api/auth/logout')).expect(204)
    expect((await agent.get('/api/me')).body.user).toBeNull()
  })

  it('ignores a tampered session cookie', async () => {
    const { app } = setup()
    const res = await request(app).get('/api/me').set('Cookie', 'pokedex_session=not-a-jwt').expect(200)
    expect(res.body.user).toBeNull()
  })
})

describe('favorites', () => {
  it('requires a signed-in user', async () => {
    const { agent } = setup()
    await agent.get('/api/favorites').expect(401)
    await mutate(agent.put('/api/favorites/pikachu')).expect(401)
  })

  it('adds, lists and removes favourites per user', async () => {
    const { agent } = setup()
    await signIn(agent, 'ash')
    await mutate(agent.put('/api/favorites/pikachu')).expect(204)
    await mutate(agent.put('/api/favorites/bulbasaur')).expect(204)
    await mutate(agent.put('/api/favorites/pikachu')).expect(204) // idempotent
    expect((await agent.get('/api/favorites')).body.favorites).toEqual(['pikachu', 'bulbasaur'])

    await mutate(agent.delete('/api/favorites/pikachu')).expect(204)
    expect((await agent.get('/api/favorites')).body.favorites).toEqual(['bulbasaur'])

    const { agent: other } = setup()
    await signIn(other, 'gary')
    expect((await other.get('/api/favorites')).body.favorites).toEqual([])
  })

  it('rejects writes without the CSRF header', async () => {
    const { agent } = setup()
    await signIn(agent)
    await agent.put('/api/favorites/pikachu').expect(403)
    await agent.post('/api/auth/logout').expect(403)
  })

  it('validates pokemon names', async () => {
    const { agent } = setup()
    await signIn(agent)
    await mutate(agent.put('/api/favorites/Not%20Valid')).expect(400)
  })

  it('imports favourites collected before signing in', async () => {
    const { agent } = setup()
    await signIn(agent)
    await mutate(agent.put('/api/favorites/mew')).expect(204)
    const res = await mutate(agent.post('/api/favorites/import')).send({ names: ['eevee', 'mew', 'eevee'] }).expect(200)
    expect(res.body.favorites.sort()).toEqual(['eevee', 'mew'])

    await mutate(agent.post('/api/favorites/import')).send({ names: ['<script>'] }).expect(400)
    await mutate(agent.post('/api/favorites/import')).send({ names: 'mew' }).expect(400)
  })
})

describe('misc', () => {
  it('answers unknown API routes with JSON 404', async () => {
    const { agent } = setup()
    const res = await agent.get('/api/nope').expect(404)
    expect(res.body.error).toBe('Not found')
  })

  it('sets security headers', async () => {
    const { agent } = setup()
    const res = await agent.get('/api/health').expect(200)
    expect(res.headers['content-security-policy']).toContain('https://pokeapi.co')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
})
