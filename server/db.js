// A tiny data layer over either node-postgres (production) or PGlite (local dev / tests).
// Both speak the same Postgres SQL and support $1 placeholders, so the queries are shared.

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    provider    TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    login       TEXT NOT NULL,
    name        TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pokemon    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, pokemon)
  );
`

export async function connect ({ databaseUrl, dataDir, memory = false }) {
  let client
  if (databaseUrl) {
    const { default: pg } = await import('pg')
    // an explicit ?sslmode=... in the URL (Neon, Supabase, ...) decides; otherwise TLS for remote hosts
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl)
    // serverless instances each keep their own pool, so keep it small (use a pooled URL, e.g. Neon's -pooler host)
    const options = { connectionString: databaseUrl, max: Number(process.env.DB_POOL_MAX) || 3 }
    if (!/[?&]sslmode=/.test(databaseUrl)) options.ssl = local ? false : { rejectUnauthorized: false }
    client = new pg.Pool(options)
  } else {
    const { PGlite } = await import('@electric-sql/pglite')
    client = memory ? new PGlite() : new PGlite(dataDir)
  }

  const query = async (sql, params) => (await client.query(sql, params)).rows

  await (client.exec ? client.exec(SCHEMA) : client.query(SCHEMA))

  const repo = createRepository(query, () => (client.end ? client.end() : client.close()))
  repo.reset = () => query('TRUNCATE favorites, users RESTART IDENTITY CASCADE') // used by tests
  return repo
}

function toUser (row) {
  return row && {
    id: row.id,
    provider: row.provider,
    login: row.login,
    name: row.name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at
  }
}

export function createRepository (query, close) {
  return {
    close,

    async upsertUser ({ provider, providerId, login, name, avatarUrl }) {
      const [row] = await query(
        `INSERT INTO users (provider, provider_id, login, name, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (provider, provider_id)
         DO UPDATE SET login = EXCLUDED.login, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
         RETURNING *`,
        [provider, String(providerId), login, name, avatarUrl]
      )
      return toUser(row)
    },

    async findUser (id) {
      const [row] = await query('SELECT * FROM users WHERE id = $1', [id])
      return toUser(row) ?? null
    },

    async listFavorites (userId) {
      const rows = await query('SELECT pokemon FROM favorites WHERE user_id = $1 ORDER BY created_at, pokemon', [userId])
      return rows.map((row) => row.pokemon)
    },

    async addFavorites (userId, names) {
      if (!names.length) return
      // one statement for any number of names: unnest the array parameter
      await query(
        `INSERT INTO favorites (user_id, pokemon)
         SELECT $1, name FROM unnest($2::text[]) AS name
         ON CONFLICT DO NOTHING`,
        [userId, names]
      )
    },

    async removeFavorite (userId, name) {
      await query('DELETE FROM favorites WHERE user_id = $1 AND pokemon = $2', [userId, name])
    }
  }
}
