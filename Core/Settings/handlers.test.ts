import { describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fault } from '../Contract/result'

const { writePersonalization, sweepFileHistory, sweepStashes } = vi.hoisted(() => ({
  writePersonalization: vi.fn(),
  sweepFileHistory: vi.fn(),
  sweepStashes: vi.fn(),
}))
vi.mock('../Nexus/session', () => ({ sessionRoot: () => '/root', adopting: () => false }))
vi.mock('./settings', () => ({ writePersonalization }))
vi.mock('../Pages/fileHistory', () => ({ sweepFileHistory }))
vi.mock('../Properties/propertyStash', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../Properties/propertyStash')>()),
  sweepStashes,
}))

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

  it('sweeps file history when either timeframe is written and the stash when the History Timeframe is, and neither for any other key', async () => {
    const ctx = { push: vi.fn(), applyZoom: vi.fn() } as unknown as HostContext
    await settingsHandlers['personalization:set'](ctx, 'openLinksInApp', true)
    expect(sweepFileHistory).not.toHaveBeenCalled()
    expect(sweepStashes).not.toHaveBeenCalled()
    await settingsHandlers['personalization:set'](ctx, 'historyDays', 14)
    expect(sweepFileHistory).toHaveBeenCalledWith('/root')
    expect(sweepStashes).toHaveBeenCalledWith('/root')
    sweepFileHistory.mockClear()
    sweepStashes.mockClear()
    await settingsHandlers['personalization:set'](ctx, 'archiveHistoryDays', 14)
    expect(sweepFileHistory).toHaveBeenCalledWith('/root')
    expect(sweepStashes).not.toHaveBeenCalled()
  })
})
