// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  askClearOption,
  askEmptyTrash,
  askDeleteView,
  askDestroyProperty,
  askFormatChange,
  askRemoveOption,
  askTrashing,
  confirmArchive,
  confirmDelete,
  countPhrase,
  offerUndo,
  spendUndo,
} from './confirmations'
import { resetUndo, undoValue } from '../../Session/undo'
import { useSession } from '../../Session/store'
import { makeTree } from '../../Testing/testTree'
import {
  clearNotification,
  currentNotification,
  notifyUndoable,
} from '../Notifications/notifications'
import type { HeldKind } from '../../Nexus/entities'
import { stubDialer } from '../../vitest.setup'
import { fault, ok, type Result } from '../../Contract/result'
import { bundleRow as row } from '../../Testing/fixtures'

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
  it('asks before a property delete, an option Remove, and a Clear past one Item whatever the switch says, naming the Items the host counts', async () => {
    const holders = vi.fn(async (_id: string, value?: string) => ok(value === undefined ? 4 : 2))
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
    expect(asked[1]).toContain('stripped from 2 Items.')
    expect(asked[2]).toMatch(/^Clear “Active” from 2 Items\?/)
  })

  it('clears an option one Item holds unasked, while a property delete and an option Remove still ask', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'property:holders': async () => ok(1),
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
    expect(asked[0]).toContain('stripped from 1 Item;')
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

  it('a delete under the system Trash Mode says it moves to the system trash', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'delete:facts': async () => ok({ trashMode: 'system', permanentDelete: false }),
    })
    const details: string[] = []
    useSession.setState({
      tree: makeTree(),
      askConfirm: async (r) => {
        details.push(r.detail)
        return false
      },
    })
    await confirmDelete({ path: 'Notes/Alpha.md', kind: 'page', title: 'Alpha' })
    expect(details).toEqual(['It will be moved to the system trash.'])
  })
})

describe('a delete through the confirmation', () => {
  const mutate = vi.fn()
  const del = (kind: HeldKind): Promise<boolean> =>
    confirmDelete({ path: 'Notes/A', kind, title: 'A' })

  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'delete:facts': async () => ok({ trashMode: 'nexus', permanentDelete: false }),
    })
    mutate.mockReset()
    mutate.mockResolvedValue({ bundled: { bundlePath: '.trash/b1' } })
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

  it('answers whether the delete went through', async () => {
    switchOn()
    expect(await del('page')).toBe(true)
    useSession.setState({ askConfirm: async () => false })
    expect(await del('page')).toBe(false)
  })

  it('an Undo given a destination restores its bundle there', async () => {
    await confirmDelete({ path: 'Notes/A', kind: 'page', title: 'A', undoTo: { kind: 'archive' } })
    await currentNotification()?.action?.run()
    expect(mutate).toHaveBeenLastCalledWith({
      op: 'restore',
      bundlePath: '.trash/b1',
      destination: { kind: 'archive' },
    })
  })

  it('offers an Undo that restores the bundle the delete answered with', async () => {
    await del('page')
    await currentNotification()?.action?.run()
    expect(mutate).toHaveBeenLastCalledWith({ op: 'restore', bundlePath: '.trash/b1' })
  })

  it('gives up its Undo and the chord once the Trash spends its bundle', async () => {
    resetUndo()
    await del('page')
    spendUndo('.trash/b1')
    expect(currentNotification()).toBeNull()
    expect(undoValue(null)).toBe(false)
    expect(mutate).not.toHaveBeenCalledWith({ op: 'restore', bundlePath: '.trash/b1' })
  })

  it('carries the configuration pass’s warning in the Deleted notice', async () => {
    const warning = 'Couldn’t update 1 Item.'
    mutate.mockResolvedValue({
      bundled: { bundlePath: '.trash/b1' },
      cascade: { pages: [], hosts: [], warning },
    })
    await del('set')
    expect(currentNotification()?.message).toBe(`Deleted “A”. ${warning}`)
    expect(currentNotification()?.tone).toBe('error')
  })

  it('counts the strip’s linkers behind a segment in the Deleted notice', async () => {
    mutate.mockResolvedValue({
      bundled: { bundlePath: '.trash/b1' },
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

describe('an Undo over several bundles', () => {
  const mutate = vi.fn()

  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'delete:facts': async () => ok({ trashMode: 'nexus', permanentDelete: false }),
    })
    mutate.mockReset()
    mutate.mockResolvedValue({})
    useSession.setState({ mutate: mutate as never })
    clearNotification()
  })

  it('an empty of one asks by its title and says It, and of more by their count and says They', async () => {
    useSession.setState({
      askConfirm: async (r) => {
        asked.push(`${r.message} ${r.detail}`)
        return true
      },
    })
    await askEmptyTrash([row({ title: 'A' })])
    await askEmptyTrash([row({}), row({})])
    expect(asked).toEqual([
      'Delete “A”? It will move to your system trash, which is where you would get it back from.',
      'Delete these 2 Pages? They will move to your system trash, which is where you would get them back from.',
    ])
  })

  it('asks once for a batch, unasked only when every item would be', async () => {
    const details: string[] = []
    useSession.setState({
      askConfirm: async (r) => {
        asked.push(r.message)
        details.push(r.detail)
        return true
      },
    })
    switchOff()
    expect(await askTrashing([row({}), row({})])).toBe(true)
    expect(asked).toEqual([])
    expect(await askTrashing([row({}), row({ kind: 'set' })])).toBe(true)
    expect(asked).toEqual(['Delete these 2 Items?'])
    expect(details).toEqual(['They will be moved to the nexus’s .trash folder (recoverable).'])
  })

  it('offers one Undo returning every bundle it was handed to the destination given', async () => {
    offerUndo(['.trash/b1', '.trash/b2'], (undo) => notifyUndoable('Deleted 2 Pages', undo), {
      kind: 'archive',
    })
    await currentNotification()?.action?.run()
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(2))
    expect(mutate.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: '.trash/b1', destination: { kind: 'archive' } }],
      [{ op: 'restore', bundlePath: '.trash/b2', destination: { kind: 'archive' } }],
    ])
  })

  it('gives up that Undo once one of its bundles is restored from elsewhere', async () => {
    offerUndo(['.trash/b1', '.trash/b2'], (undo) => notifyUndoable('Deleted 2 Pages', undo))
    spendUndo('.trash/b2')
    expect(currentNotification()).toBeNull()
    expect(mutate).not.toHaveBeenCalled()
  })
})

describe('an archive through the confirmation', () => {
  const BUNDLE = '.nexus/archive/c1/Notes/1__A.archived'
  const mutate = vi.fn()
  const archive = (kind: 'page' | 'set'): Promise<void> =>
    confirmArchive({ path: 'Notes/A', kind, title: 'A' })

  beforeEach(() => {
    mutate.mockReset()
    mutate.mockResolvedValue({ bundled: { bundlePath: BUNDLE } })
    useSession.setState({ mutate: mutate as never })
    clearNotification()
  })

  it('asks “Archive “A”?” in the positive tone and sends the archive', async () => {
    const seen: unknown[] = []
    useSession.setState({
      tree: makeTree(),
      askConfirm: async (req) => {
        seen.push(req)
        return true
      },
    })
    await archive('page')
    expect(seen).toEqual([
      {
        message: 'Archive “A”?',
        detail: '“A” will be moved to this Collection’s archive, where it can be restored.',
        action: 'Archive',
        tone: 'positive',
      },
    ])
    expect(mutate).toHaveBeenCalledWith({ op: 'archive', path: 'Notes/A', kind: 'page' })
  })

  it('with Confirm Before Archiving off, archives a page and a Set unasked, and Confirm Before Deletion has no say', async () => {
    useSession.setState({ tree: makeTree({ personalization: { confirmArchiving: false } }) })
    await archive('page')
    await archive('set')
    expect(asked).toEqual([])
    useSession.setState({ tree: makeTree({ personalization: { confirmDeletion: false } }) })
    await archive('set')
    expect(asked).toHaveLength(1)
    expect(mutate).toHaveBeenCalledTimes(3)
  })

  it('posts Archived “A” with an Undo that restores its bundle, whatever the switch says', async () => {
    for (const confirmArchiving of [false, true]) {
      useSession.setState({ tree: makeTree({ personalization: { confirmArchiving } }) })
      clearNotification()
      await archive('page')
      expect(currentNotification()).toMatchObject({
        message: 'Archived “A”',
        tone: 'normal',
        action: { label: 'Undo' },
      })
      expect(currentNotification()?.segment).toBeUndefined()
      await currentNotification()?.action?.run()
      expect(mutate).toHaveBeenLastCalledWith({ op: 'restore', bundlePath: BUNDLE })
    }
    expect(asked).toEqual(['Archive “A”?'])
  })

  it('archives nothing when the question is declined', async () => {
    useSession.setState({ tree: makeTree(), askConfirm: async () => false })
    await archive('page')
    expect(mutate).not.toHaveBeenCalled()
  })
})

describe('a delete’s question', () => {
  it('asks of one row by its title, of more by their count, Items where the kinds mix', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'delete:facts': async () => ok({ trashMode: 'nexus', permanentDelete: false }),
    })
    switchOn()
    await askTrashing([row({ title: 'Ideas' })])
    await askTrashing([row({}), row({})])
    await askTrashing([row({}), row({ kind: 'set' })])
    expect(asked).toEqual(['Delete “Ideas”?', 'Delete these 2 Pages?', 'Delete these 2 Items?'])
  })
})

describe('countPhrase', () => {
  it('names the kind when every row shares one', () => {
    expect(countPhrase([row({}), row({})])).toBe('2 Pages')
    expect(countPhrase([row({ kind: 'set' }), row({ kind: 'set' })])).toBe('2 Sets')
    expect(countPhrase([row({ kind: 'context' }), row({ kind: 'context' })])).toBe('2 Contexts')
  })

  it('generalizes when they do not', () => {
    expect(countPhrase([row({}), row({ kind: 'space' })])).toBe('2 Items')
  })

  it('stays singular for one', () => {
    expect(countPhrase([row({})])).toBe('1 Page')
    expect(countPhrase([row({ kind: 'space' })])).toBe('1 Space')
  })

  it('reports none honestly', () => {
    expect(countPhrase([])).toBe('0 Items')
  })
})
