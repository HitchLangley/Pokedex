// Vercel serverless entry point: every /api/* request is routed here (see vercel.json).
// The app and the database pool are created once per function instance and reused.
import { createApp } from '../server/app.js'
import { loadConfig } from '../server/config.js'
import { connect } from '../server/db.js'

let appPromise

async function init () {
  const config = loadConfig()
  const db = await connect(config)
  return createApp({ db, config })
}

export default async function handler (req, res) {
  appPromise ??= init().catch((err) => {
    appPromise = null // retry on the next request instead of caching the failure
    throw err
  })
  const app = await appPromise
  return app(req, res)
}
