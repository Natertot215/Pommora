import { rm, stat } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { interfaceHandlers } from '../Interface/handlers'
import { nexusHandlers } from '../Nexus/handlers'
import { closeSession, openSession, whileAdopting } from '../Nexus/session'
import { readValue } from '../Platform/localState'
import { installStores, NO_STORES } from '../Platform/stores'
import { realpathPosix, tempRoot } from '../Testing/hostFs'
import { memoryStores } from '../Testing/memoryStores'
import { viewsHandlers } from '../Views/handlers'
import type { HostContext } from './handlers'
import { BUSY, ok } from './result'

let root: string
const ctx = {} as HostContext

beforeEach(async () => {
  root = await realpathPosix(tempRoot('pom-session-gate-'))
  installStores(memoryStores().stores)
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('the session gate during a Nexus switch', () => {
  it('refuses every write with BUSY and writes nothing, while reads still answer', async () => {
    let release!: () => void
    const held = whileAdopting(() => new Promise<void>((r) => (release = r)))
    expect(await interfaceHandlers['glance:save'](ctx, { w: 10, h: 10 })).toEqual(BUSY)
    expect(await viewsHandlers['views:save'](ctx, 'Notes', 'collection', {})).toEqual(BUSY)
    expect(readValue('glancePane')).toBeNull()
    expect(await interfaceHandlers['glance:load'](ctx)).toEqual(ok(null))
    release()
    await held
    expect(await interfaceHandlers['glance:save'](ctx, { w: 10, h: 10 })).toEqual(ok(null))
  })

  it('opens no Nexus at a recent path that no longer exists', async () => {
    const moved = `${root}/Moved/MyNexus`
    expect(await nexusHandlers['nexus:openPath'](ctx, moved)).toEqual(ok(false))
    await expect(stat(moved)).rejects.toThrow()
  })
})
