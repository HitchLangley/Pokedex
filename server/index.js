import { createApp } from './app.js'
import { githubEnabled, loadConfig } from './config.js'
import { connect } from './db.js'

const config = loadConfig()
const db = await connect(config)
const app = createApp({ db, config })

const server = app.listen(config.port, () => {
  console.log(`Pokédex server listening on http://localhost:${config.port}`)
  console.log(`  database: ${config.databaseUrl ? 'Postgres (DATABASE_URL)' : `PGlite at ${config.dataDir}`}`)
  console.log(`  GitHub login: ${githubEnabled(config) ? 'enabled' : 'not configured'}${config.devLogin ? ', dev login: enabled' : ''}`)
})

async function shutdown () {
  server.close()
  await db.close()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
