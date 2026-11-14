import { randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'pokedex_session'
export const STATE_COOKIE = 'pokedex_oauth_state'
const SESSION_DAYS = 30

export function createSessions (secret) {
  const key = new TextEncoder().encode(secret)

  return {
    async sign (userId) {
      return new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(String(userId))
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DAYS}d`)
        .sign(key)
    },
    async verify (token) {
      if (!token) return null
      try {
        const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
        return Number(payload.sub) || null
      } catch {
        return null
      }
    },
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  }
}

export function randomState () {
  return randomBytes(16).toString('hex')
}

// only allow redirects back into our own app
export function safeReturnTo (value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/'
}

export function githubAuthorizeUrl ({ clientId, redirectUri, state }) {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state,
    allow_signup: 'true'
  })
  return url.toString()
}

export async function fetchGithubProfile ({ code, clientId, clientSecret, redirectUri, fetchFn = fetch }) {
  const tokenRes = await fetchFn('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri })
  })
  const token = await tokenRes.json()
  if (!tokenRes.ok || !token.access_token) {
    throw new Error(`GitHub token exchange failed: ${token.error_description || token.error || tokenRes.status}`)
  }

  const userRes = await fetchFn('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.access_token}`,
      'User-Agent': 'pokedex-app'
    }
  })
  if (!userRes.ok) throw new Error(`GitHub user request failed: ${userRes.status}`)
  const profile = await userRes.json()

  return {
    provider: 'github',
    providerId: profile.id,
    login: profile.login,
    name: profile.name || profile.login,
    avatarUrl: profile.avatar_url
  }
}
