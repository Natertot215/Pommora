import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '../Contract/result'

const { readScope, sessionRoot } = vi.hoisted(() => ({
  readScope: vi.fn(),
  sessionRoot: vi.fn(),
}))

vi.mock('../Platform/localState', () => ({ readScope, writeKey: vi.fn(() => true) }))
vi.mock('../Nexus/session', () => ({ sessionRoot }))

const { webHandlers } = await import('./handlers')

beforeEach(() => {
  readScope.mockReset()
  sessionRoot.mockReset()
})

describe('linkTitles:get answers the envelope, never a bare reply', () => {
  it('returns ok(cache) when the scope reads cleanly', async () => {
    sessionRoot.mockReturnValue('/root-clean')
    readScope.mockReturnValue({ 'https://x': 'X' })
    expect(await webHandlers['linkTitles:get']()).toEqual(ok({ 'https://x': 'X' }))
  })

  it('lets a scope read throw reject to the boundary rather than handing back a bare object', async () => {
    sessionRoot.mockReturnValue('/root-throws')
    readScope.mockImplementation(() => {
      throw new Error('unreadable')
    })
    await expect(webHandlers['linkTitles:get']()).rejects.toThrow('unreadable')
  })
})
