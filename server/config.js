import { fileURLToPath } from 'node:url'

const production = process.env.NODE_ENV === 'production'

export function loadConfig (env = process.env) {
  const port = Number(env.PORT) || 3000
  const publicUrl = (env.PUBLIC_URL || `http://localhost:${env.VITE_PORT || 5173}`).replace(/\/$/, '')

  const config = {
    production,
    port,
    publicUrl,
    // Postgres in production; an embedded PGlite database (stored on disk) otherwise
    databaseUrl: env.DATABASE_URL || null,
    dataDir: env.DATA_DIR || fileURLToPath(new URL('../.data/pglite', import.meta.url)),
    sessionSecret: env.SESSION_SECRET || (production ? null : 'dev-only-secret-change-me-dev-only-secret'),
    github: {
      clientId: env.GITHUB_CLIENT_ID || null,
      clientSecret: env.GITHUB_CLIENT_SECRET || null
    },
    // lets you try the app locally without registering an OAuth app; never enabled in production
    devLogin: !production && env.DEV_LOGIN !== '0',
    staticDir: fileURLToPath(new URL('../dist', import.meta.url))
  }

  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters')
  }
  if (production && !env.PUBLIC_URL) {
    throw new Error('PUBLIC_URL must be set in production (e.g. https://pokedex.onrender.com)')
  }
  return config
}

export function githubEnabled (config) {
  return Boolean(config.github.clientId && config.github.clientSecret)
}
