import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fault, NO_STORE, ok } from '../Contract/result'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'

vi.mock('../Nexus/session', () => ({ sessionRoot: () => '/root', adopting: () => false }))

const { navigationHandlers } = await import('./handlers')

describe('capture:thumbnail', () => {
  it('refuses a key that could name a file outside the thumbnails folder, before any capture', async () => {
    const ctx = { thumbnails: { capture: vi.fn() } } as unknown as HostContext
    const rect = { x: 0, y: 0, width: 10, height: 10 }
    expect(await navigationHandlers['capture:thumbnail'](ctx, '../../outside', rect, 1)).toEqual(
      fault('Bad capture args.'),
    )
    expect(
      await navigationHandlers['capture:thumbnail'](
        ctx,
        'page:01ARZ3NDEKTSV4RRFFQ69G5FAV',
        rect,
        Number.NaN,
      ),
    ).toEqual(fault('Bad capture args.'))
    expect(ctx.thumbnails.capture).not.toHaveBeenCalled()
  })
})

describe('nav:write', () => {
  const ctx = {} as HostContext
  const recents = [{ kind: 'page', id: 'p1' }]
  afterEach(() => installStores(NO_STORES))

  it('reports a recents write that has no store to land in', async () => {
    installStores(NO_STORES)
    expect(await navigationHandlers['nav:write'](ctx, { recents })).toEqual(NO_STORE)
  })

  it('answers ok once the recents land', async () => {
    installStores(memoryStores().stores)
    expect(await navigationHandlers['nav:write'](ctx, { recents })).toEqual(ok(null))
  })
})
