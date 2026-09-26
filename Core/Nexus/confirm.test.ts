import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { pushConfirmed } from './confirm'
import { closeSession, openSession } from './session'
import type { NexusTree } from './tree'

const tree = { nexus: { rootPath: '/nexus-a' } } as NexusTree
const turn = (): Promise<void> => new Promise((wake) => setTimeout(wake, 0))

afterEach(() => closeSession())

describe('pushConfirmed', () => {
  it('pushes a tree of the Nexus still open', async () => {
    const push = vi.fn()
    await openSession('/nexus-a')
    pushConfirmed({ push } as unknown as HostContext, tree)
    await turn()
    expect(push).toHaveBeenCalledWith('nexus:changed', tree)
  })

  it('pushes nothing once the session has left the tree’s Nexus', async () => {
    const push = vi.fn()
    await openSession('/nexus-a')
    pushConfirmed({ push } as unknown as HostContext, tree)
    closeSession()
    await turn()
    expect(push).not.toHaveBeenCalled()
  })
})
