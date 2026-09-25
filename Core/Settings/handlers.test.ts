import { describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fault } from '../Contract/result'

const { writePersonalization } = vi.hoisted(() => ({ writePersonalization: vi.fn() }))
vi.mock('../Nexus/session', () => ({ sessionRoot: () => '/root', adopting: () => false }))
vi.mock('./settings', () => ({ writePersonalization }))

const { settingsHandlers } = await import('./handlers')

describe('personalization:set', () => {
  it('refuses a key the settings do not declare and writes a value through its own field', async () => {
    const ctx = { push: vi.fn(), applyZoom: vi.fn() } as unknown as HostContext
    expect(await settingsHandlers['personalization:set'](ctx, '__proto__', true)).toEqual(
      fault('Invalid personalization key.'),
    )
    expect(writePersonalization).not.toHaveBeenCalled()
    await settingsHandlers['personalization:set'](ctx, 'openLinksInApp', 'yes')
    expect(writePersonalization).toHaveBeenCalledWith('/root', 'openLinksInApp', undefined)
  })
})
