// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  askClearOption,
  askDeleteView,
  askDestroyProperty,
  askRemoveOption,
  confirmDelete,
} from './confirmations'
import { useSession } from '../../Session/store'
import { clearNotification, currentNotification } from '../Notifications/notifications'
import type { MutableKind } from '@pommora/core/Nexus/mutateRequest'
import { stubDialer } from '../../vitest.setup'
import { ok } from '@pommora/core/Contract/result'

const asked: string[] = []

beforeEach(() => {
  asked.length = 0
  useSession.setState({
    askConfirm: async (req) => {
      asked.push(req.message)
      return true
    },
  })
})

const switchOff = (): void => {
  const p = useSession.getState().personalization
  useSession.setState({ personalization: { ...p, confirmDeletion: false } })
}
const switchOn = (): void => {
  const { confirmDeletion: _off, ...p } = useSession.getState().personalization
  useSession.setState({ personalization: p })
}

describe('what the Confirm Before Deletion switch governs', () => {
  it('lets the switch waive a property, an option, and a clear', async () => {
    switchOff()
    await askDestroyProperty('Status')
    await askRemoveOption('Active')
    await askClearOption('Active')
    expect(asked).toEqual([])
  })

  it('asks for all three when the switch is on', async () => {
    switchOn()
    await askDestroyProperty('Status')
    await askRemoveOption('Active')
    await askClearOption('Active')
    expect(asked).toHaveLength(3)
  })

  it('asks before deleting a view whatever the switch says', async () => {
    switchOff()
    await askDeleteView()
    await askDeleteView('tile')
    expect(asked).toHaveLength(2)
  })

  it('names the surface a view is leaving', async () => {
    switchOn()
    useSession.setState({
      askConfirm: async (r) => {
        asked.push(r.detail)
        return true
      },
    })
    await askDeleteView()
    await askDeleteView('tile')
    expect(asked[0]).toContain('from the container')
    expect(asked[1]).toContain('from the tile')
  })
})

describe('a delete through the confirmation', () => {
  const mutate = vi.fn()
  const del = (kind: MutableKind): Promise<void> =>
    confirmDelete({ path: 'Notes/A', kind, title: 'A' })

  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'delete:facts': async () => ok({ trashMode: 'nexus', permanentDelete: false }),
    })
    mutate.mockReset()
    mutate.mockResolvedValue({ trashed: { bundlePath: '.trash/b1' } })
    useSession.setState({ mutate: mutate as never })
    clearNotification()
  })

  it('with the switch off, deletes a page unasked while a container, Space, or Context still asks', async () => {
    switchOff()
    await del('page')
    expect(asked).toEqual([])
    for (const kind of ['collection', 'set', 'space', 'context'] as const) await del(kind)
    expect(asked).toHaveLength(4)
    expect(mutate).toHaveBeenCalledTimes(5)
  })

  it('deletes nothing when the question is declined', async () => {
    switchOn()
    useSession.setState({ askConfirm: async () => false })
    await del('page')
    expect(mutate).not.toHaveBeenCalled()
  })

  it('offers an Undo that restores the bundle the delete answered with', async () => {
    await del('page')
    await currentNotification()?.action?.run()
    expect(mutate).toHaveBeenLastCalledWith({ op: 'restore', bundlePath: '.trash/b1' })
  })

  it('carries the configuration pass’s warning in the Deleted notice', async () => {
    const warning = 'Couldn’t update 1 file.'
    mutate.mockResolvedValue({
      trashed: { bundlePath: '.trash/b1' },
      cascade: { pages: [], hosts: [], warning },
    })
    await del('set')
    expect(currentNotification()?.message).toBe(`Deleted “A”. ${warning}`)
    expect(currentNotification()?.tone).toBe('error')
  })

  it('counts the strip’s linkers behind a segment in the Deleted notice', async () => {
    mutate.mockResolvedValue({
      trashed: { bundlePath: '.trash/b1' },
      cascade: { pages: ['A.md', 'B.md'], hosts: [] },
    })
    await del('page')
    expect(currentNotification()).toMatchObject({
      message: 'Deleted “A”',
      segment: '2 Internal Links',
      tone: 'normal',
    })
  })

  it('offers no Undo for a system-trash delete, which leaves no bundle, and still counts its linkers', async () => {
    mutate.mockResolvedValue({ cascade: { pages: ['A.md'], hosts: [] } })
    await del('page')
    expect(currentNotification()).toMatchObject({
      message: 'Deleted “A”',
      segment: '1 Internal Link',
    })
    expect(currentNotification()?.action).toBeUndefined()
  })
})
