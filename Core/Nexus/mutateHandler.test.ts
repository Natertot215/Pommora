import { describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fault } from '../Contract/result'

vi.mock('./session', () => ({ sessionRoot: () => '/root', adopting: () => false }))

const { nexusHandlers } = await import('./handlers')

describe('mutate', () => {
  it('answers a malformed request with a refusal, never a throw or a write', async () => {
    const ctx = { push: vi.fn() } as unknown as HostContext
    expect(await nexusHandlers.mutate(ctx, null)).toEqual(fault('Malformed request.'))
    expect(
      await nexusHandlers.mutate(ctx, {
        op: 'reorderChildren',
        parentPath: 'A',
        key: 'id',
        order: [],
      }),
    ).toEqual(fault('Malformed request.'))
  })
})
