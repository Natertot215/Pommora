// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  askClearOption,
  askDeleteView,
  askDestroyProperty,
  askFormatChange,
  askRemoveOption,
  confirmDelete,
  spendBundle,
} from './confirmations'
import { resetUndo, undoValue } from '../../Session/undo'
import { useSession } from '../../Session/store'
import { makeTree } from '../../Testing/testTree'
import { clearNotification, currentNotification } from '../Notifications/notifications'
import type { HeldKind } from '../../Nexus/entities'
import { stubDialer } from '../../vitest.setup'
import { fault, ok, type Result } from '../../Contract/result'

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
  useSession.setState({ tree: makeTree({ personalization: { confirmDeletion: false } }) })
}
const switchOn = (): void => {
  useSession.setState({ tree: makeTree() })
}

describe('what the Confirm Before Deletion switch governs', () => {
  it('asks before a property delete and an option Remove and Clear whatever the switch says, naming the Items the host counts', async () => {
    const holders = vi.fn(async (_id: string, value?: string) => ok(value === undefined ? 4 : 1))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'property:holders': holders })
    useSession.setState({
      askConfirm: async (r) => {
        asked.push(`${r.message} ${r.detail}`)
        return true
      },
    })
    switchOff()
    await askDestroyProperty('p1', 'Status')
    await askRemoveOption('p1', 'Active')
    await askClearOption('p1', 'Active')
    expect(holders.mock.calls).toEqual([
      ['p1', undefined],
      ['p1', 'Active'],
      ['p1', 'Active'],
    ])
    expect(asked[0]).toContain('stripped from 4 Items;')
    expect(asked[1]).toContain('stripped from 1 Item.')
    expect(asked[2]).toMatch(/^Clear “Active” from 1 Item\?/)
  })

  it('clears an option no Item holds unasked, while a property delete and an option Remove still ask', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'property:holders': async () => ok(0),
    })
    useSession.setState({
      askConfirm: async (r) => {
        asked.push(`${r.message} ${r.detail}`)
        return true
      },
    })
    expect(await askClearOption('p1', 'Active')).toBe(true)
    expect(asked).toEqual([])
    await askDestroyProperty('p1', 'Status')
    await askRemoveOption('p1', 'Active')
    expect(asked).toHaveLength(2)
    expect(asked[0]).toContain('stripped from 0 Items;')
  })

  it('asks before a format change rewriting more than one Item, counting the change, and rewrites one or none unasked', async () => {
    const holders = vi.fn(async (): Promise<Result<number>> => ok(2))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'property:holders': holders })
    expect(await askFormatChange('p1', { key_format: 'lowercase' })).toBe(true)
    expect(asked).toEqual(['This action would rewrite metadata in 2 Items.'])
    expect(holders.mock.calls).toEqual([['p1', { key_format: 'lowercase' }]])
    asked.length = 0
    for (const count of [1, 0]) {
      holders.mockResolvedValueOnce(ok(count))
      expect(await askFormatChange('p1', { key_format: 'lowercase' })).toBe(true)
    }
    expect(asked).toEqual([])
    holders.mockResolvedValueOnce(fault('That property no longer exists.'))
    expect(await askFormatChange('p1', { key_format: 'lowercase' })).toBe(false)
    expect(asked).toEqual([])
  })

  it('tells a Key Format change its keys change and a Value Format change its values do, each keeping its display label', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'property:holders': async () => ok(2),
    })
    const details: string[] = []
    useSession.setState({
      askConfirm: async (req) => {
        details.push(req.detail)
        return true
      },
    })
    await askFormatChange('p1', { key_format: 'lowercase' })
    await askFormatChange('p1', { value_format: 'lowercase' })
    expect(details).toEqual([
      'Each key changes to the new format; its display label stays the same.',
      'Each value changes to the new format; its display label stays the same.',
    ])
  })

  it('asks nothing when the host refuses the count', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'property:holders': async () => fault('That option no longer exists.'),
    })
    expect(await askRemoveOption('p1', 'Gone')).toBe(false)
    expect(asked).toEqual([])
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
  const del = (kind: HeldKind): Promise<void> =>
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

  it('gives up its Undo and the chord once the Trash spends its bundle', async () => {
    resetUndo()
    await del('page')
    spendBundle('.trash/b1')
    expect(currentNotification()).toBeNull()
    expect(undoValue(null)).toBe(false)
    expect(mutate).not.toHaveBeenCalledWith({ op: 'restore', bundlePath: '.trash/b1' })
  })

  it('carries the configuration pass’s warning in the Deleted notice', async () => {
    const warning = 'Couldn’t update 1 Item.'
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
