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
import { currentNotification } from '../Notifications/notifications'
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

describe('a confirmed delete', () => {
  it('offers an Undo that restores the bundle the delete answered with', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'delete:facts': async () => ok({ trashMode: 'nexus', permanentDelete: false }),
    })
    const mutate = vi.fn(async () => ({ trashed: { bundlePath: '.trash/b1' } }))
    useSession.setState({ mutate: mutate as never })
    await confirmDelete({ path: 'Notes/A.md', kind: 'page', title: 'A' })
    await currentNotification()?.action?.run()
    expect(mutate).toHaveBeenLastCalledWith({ op: 'restore', bundlePath: '.trash/b1' })
  })
})
