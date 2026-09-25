import { describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fault } from '../Contract/result'

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
