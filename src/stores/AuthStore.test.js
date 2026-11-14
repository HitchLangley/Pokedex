import { describe, expect, it } from 'vitest'
import { AuthStore } from './AuthStore'
import { TRAINER, createFakeBackend } from '../test/fixtures'

describe('AuthStore', () => {
  it('loads the current user', async () => {
    const auth = new AuthStore({ backend: createFakeBackend({ user: TRAINER }) })
    await auth.init()
    expect(auth.available).toBe(true)
    expect(auth.user.login).toBe('ash')
  })

  it('is unavailable in the static build', async () => {
    const auth = new AuthStore({ backend: createFakeBackend({ enabled: false }) })
    await auth.init()
    expect(auth.status).toBe('unavailable')
  })

  it('is unavailable when the API cannot be reached', async () => {
    const backend = { ...createFakeBackend(), me: async () => { throw new Error('404') } }
    const auth = new AuthStore({ backend })
    await auth.init()
    expect(auth.status).toBe('unavailable')
  })

  it('signs out', async () => {
    const auth = new AuthStore({ backend: createFakeBackend({ user: TRAINER }) })
    await auth.init()
    await auth.logout()
    expect(auth.signedIn).toBe(false)
  })
})
