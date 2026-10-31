// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  askClearOption,
  askEmptyTrash,
  askDeleteView,
  askDeleteOption,
  askRewrite,
  askTrashing,
  confirmArchive,
  confirmDelete,
  runBundled,
} from './confirmations'
import { pushUndo, resetUndo, undoValue } from '../../Session/undo'
import { pageIO, scheduleBodySave } from '../../Session/saveScheduler'
import { storesChanged } from '../../Session/nexusSlice'
import { useSession } from '../../Session/store'
import { makeTree } from '../../Testing/testTree'
import { clearNotification, currentNotification } from '../Notifications/notifications'
import type { HeldKind } from '../../Nexus/entities'
import type { MutateRequest } from '../../Nexus/mutateRequest'
import type { CountedChange } from '../../Properties/properties'
import { stubDialer } from '../../vitest.setup'
import { fault, ok, type Result } from '../../Contract/result'
import type { BundleRow } from '../../Bundles/rows'
import { bundleRow as row, nexus, stubBrowserEachTest } from '../../Testing/bundles'

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
  it('asks before a property delete, an option Delete, and a Clear past one Item whatever the switch says, naming the Items the host counts', async () => {
    const holders = vi.fn(async (_id: string, counted: CountedChange) =>
      ok(counted.of === 'property' ? 4 : 2),
    )
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'property:holders': holders })
    useSession.setState({
      mutate: (async () => ({})) as never,
      askConfirm: async (r) => {
        asked.push(`${r.message} ${r.detail}`)
        return true
      },
    })
    switchOff()
    await confirmDelete({ propertyId: 'p1', title: 'Status' })
    await askDeleteOption('p1', { id: 'opt_Active', label: 'Active' })
    await askClearOption('p1', { id: 'opt_Active', label: 'Active' })
    expect(holders.mock.calls).toEqual([
      ['p1', { of: 'property' }],
      ['p1', { of: 'option', optionId: 'opt_Active' }],
      ['p1', { of: 'option', optionId: 'opt_Active' }],
    ])
    expect(asked[0]).toContain('stripped from 4 Items;')
    expect(asked[1]).toMatch(/^Delete “Active”\? .*stripped from 2 Items\.$/)
    expect(asked[2]).toMatch(/^Clear “Active” from 2 Items\?/)
  })

  it('clears an option one Item holds unasked, while a property delete and an option Delete still ask', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'property:holders': async () => ok(1),
    })
    useSession.setState({
      mutate: (async () => ({})) as never,
      askConfirm: async (r) => {
        asked.push(`${r.message} ${r.detail}`)
        return true
      },
    })
    expect(await askClearOption('p1', { id: 'opt_Active', label: 'Active' })).toBe(true)
    expect(asked).toEqual([])
    await confirmDelete({ propertyId: 'p1', title: 'Status' })
    await askDeleteOption('p1', { id: 'opt_Active', label: 'Active' })
    expect(asked).toHaveLength(2)
    expect(asked[0]).toContain('stripped from 1 Item;')
  })

  it('a property or an option nothing holds still asks to delete, without the strip clause', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'property:holders': async () => ok(0),
    })
    useSession.setState({
      mutate: (async () => ({})) as never,
      askConfirm: async (r) => {
        asked.push(r.detail)
        return true
      },
    })
    await confirmDelete({ propertyId: 'p1', title: 'Status' })
    await askDeleteOption('p1', { id: 'opt_Active', label: 'Active' })
    expect(asked).toEqual([
      'It is removed from every collection; a restorable record lands in the nexus’s .trash folder.',
      'The option is deleted from the property.',
    ])
  })

  it('asks before a format change rewriting more than one Item, counting the change, and rewrites one or none unasked', async () => {
    const holders = vi.fn(async (): Promise<Result<number>> => ok(2))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'property:holders': holders })
    expect(await askRewrite('p1', { of: 'format', change: { key_format: 'lowercase' } })).toBe(true)
    expect(asked).toEqual(['This action would rewrite metadata in 2 Items.'])
    expect(holders.mock.calls).toEqual([
      ['p1', { of: 'format', change: { key_format: 'lowercase' } }],
    ])
    asked.length = 0
    for (const count of [1, 0]) {
      holders.mockResolvedValueOnce(ok(count))
      expect(await askRewrite('p1', { of: 'format', change: { key_format: 'lowercase' } })).toBe(
        true,
      )
    }
    expect(asked).toEqual([])
    holders.mockResolvedValueOnce(fault('That property no longer exists.'))
    expect(await askRewrite('p1', { of: 'format', change: { key_format: 'lowercase' } })).toBe(
      false,
    )
    expect(asked).toEqual([])
  })

  it('a rename that moves a key asks with the rewrite count, and one that keeps it asks nothing', async () => {
    const holders = vi.fn(async (): Promise<Result<number>> => ok(3))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'property:holders': holders })
    expect(await askRewrite('p1', { of: 'rename', label: 'Stage' })).toBe(true)
    expect(asked).toEqual(['This action would rewrite metadata in 3 Items.'])
    holders.mockResolvedValueOnce(ok(0))
    expect(await askRewrite('p1', { of: 'rename', label: 'stage' })).toBe(true)
    expect(asked).toHaveLength(1)
    expect(holders.mock.calls).toEqual([
      ['p1', { of: 'rename', label: 'Stage' }],
      ['p1', { of: 'rename', label: 'stage' }],
    ])
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
    await askRewrite('p1', { of: 'format', change: { key_format: 'lowercase' } })
    await askRewrite('p1', { of: 'format', change: { value_format: 'lowercase' } })
    expect(details).toEqual([
      'Each key changes to the new format; its display label stays the same.',
      'Each value changes to the new format; its display label stays the same.',
    ])
  })

  it('asks nothing when the host refuses the count', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'property:holders': async () => fault('That option no longer exists.'),
    })
    expect(await askDeleteOption('p1', { id: 'opt_Gone', label: 'Gone' })).toBe(false)
    expect(asked).toEqual([])
  })

  it('asks before deleting a view whatever the switch says', async () => {
    switchOff()
    await askDeleteView()
    await askDeleteView('tile')
    expect(asked).toHaveLength(2)
  })

  it('an empty from the Trash asks with Confirm Before Deletion off', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:permanentDelete': async () => ok(false),
    })
    switchOff()
    await askEmptyTrash([row({ title: 'A' })])
    expect(asked).toHaveLength(1)
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
  const del = (kind: HeldKind): Promise<boolean> =>
    confirmDelete({ path: 'Notes/A', kind, title: 'A' })

  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({})
    mutate.mockReset()
    mutate.mockResolvedValue({ undo: { op: 'restore', bundlePath: '.trash/b1' } })
    useSession.setState({ mutate: mutate as never })
    clearNotification()
  })

  it('a property delete asks its own question, counting what holds it, deletes through its op, and a delete that missed a file offers Try Again, which sends { op: finishOwed }', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'property:holders': async () => ok(2),
    })
    const details: string[] = []
    useSession.setState({
      askConfirm: async (r) => {
        details.push(`${r.message} ${r.detail}`)
        return true
      },
    })
    mutate.mockResolvedValueOnce({
      undo: { op: 'restore', bundlePath: '.trash/p1' },
      cascade: { pages: [], hosts: [], warning: 'W', owed: true },
    })
    expect(await confirmDelete({ propertyId: 'p1', title: 'Status' })).toBe(true)
    expect(details[0]).toMatch(/^Delete “Status” everywhere\? .*stripped from 2 Items; /)
    expect(mutate).toHaveBeenCalledWith({ op: 'deleteProperty', propertyId: 'p1' })
    await currentNotification()?.action?.run()
    expect(mutate).toHaveBeenLastCalledWith({ op: 'finishOwed' })
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

  it('offers an Undo that restores the bundle the delete answered with', async () => {
    await del('page')
    await currentNotification()?.action?.run()
    expect(mutate).toHaveBeenLastCalledWith({ op: 'restore', bundlePath: '.trash/b1' })
  })

  it('gives up its Undo and the chord once the Trash spends its bundle', async () => {
    resetUndo()
    await del('page')
    mutate.mockResolvedValueOnce({})
    await runBundled(null, [
      {
        title: 'A',
        kind: 'page',
        req: { op: 'emptyBundle', bundlePath: '.trash/b1' },
        bundlePath: '.trash/b1',
      },
    ])
    expect(currentNotification()).toBeNull()
    expect(undoValue(null)).toBe(false)
    expect(mutate).not.toHaveBeenCalledWith({ op: 'restore', bundlePath: '.trash/b1' })
  })

  it('carries the configuration pass’s warning in the Deleted notice', async () => {
    const warning = 'Couldn’t update 1 Item.'
    mutate.mockResolvedValue({
      undo: { op: 'restore', bundlePath: '.trash/b1' },
      cascade: { pages: [], hosts: [], warning },
    })
    await del('set')
    expect(currentNotification()?.message).toBe(`Deleted “A”. ${warning}`)
    expect(currentNotification()?.tone).toBe('error')
  })

  it('counts the strip’s linkers behind a segment in the Deleted notice', async () => {
    mutate.mockResolvedValue({
      undo: { op: 'restore', bundlePath: '.trash/b1' },
      cascade: { pages: ['A.md', 'B.md'], hosts: [] },
    })
    await del('page')
    expect(currentNotification()).toMatchObject({
      message: 'Deleted “A”',
      segment: '2 Internal Links',
      tone: 'normal',
    })
  })
})

describe('an Undo over several bundles', () => {
  const mutate = vi.fn()

  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:permanentDelete': async () => ok(false),
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

  const undos: MutateRequest[] = [
    { op: 'restore', bundlePath: '.trash/b1', destination: { kind: 'archive', at: 'x' } },
    { op: 'restore', bundlePath: '.trash/b2' },
  ]
  const offered = async (): Promise<void> => {
    mutate.mockResolvedValueOnce({ undo: undos[0] }).mockResolvedValueOnce({ undo: undos[1] })
    await runBundled(
      'Deleted',
      ['A', 'B'].map((title) => ({
        title,
        kind: 'page' as const,
        req: { op: 'delete' as const, path: title, kind: 'page' as const },
      })),
    )
    mutate.mockClear()
  }

  it('offers one Undo running every request it was handed', async () => {
    await offered()
    await currentNotification()?.action?.run()
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(2))
    expect(mutate.mock.calls).toEqual([
      [undos[0], { quiet: true }],
      [undos[1], { quiet: true }],
    ])
  })

  it('gives up that Undo once one of its bundles is restored from elsewhere', async () => {
    await offered()
    await runBundled(null, [{ title: 'B', kind: 'page', req: undos[1], bundlePath: '.trash/b2' }])
    expect(currentNotification()).toBeNull()
    expect(mutate).not.toHaveBeenCalledWith(undos[0], { quiet: true })
  })

  it('an Undo’s own run posts every line its replies carry in one notice', async () => {
    const warning = 'Couldn’t update 1 Item.'
    await offered()
    mutate
      .mockResolvedValueOnce({ unrestored: ['Beta'] })
      .mockResolvedValueOnce({ cascade: { pages: [], hosts: [], warning } })
    await currentNotification()?.action?.run()
    await vi.waitFor(() =>
      expect(currentNotification()?.message).toBe(`Beta didn’t get its value back. ${warning}`),
    )
  })

  it('an Undo over several bundles counts a refusal among its lines', async () => {
    await offered()
    mutate
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ cascade: { pages: [], hosts: [], warning: 'W' } })
    await currentNotification()?.action?.run()
    await vi.waitFor(() =>
      expect(currentNotification()?.message).toBe('1 Page couldn’t be undone. W'),
    )
  })
})

describe('an archive through the confirmation', () => {
  const BUNDLE = '.nexus/archive/c1/Notes/1__A.archived'
  const mutate = vi.fn()
  const archive = (kind: 'page' | 'set'): Promise<void> =>
    confirmArchive({ path: 'Notes/A', kind, title: 'A' })

  beforeEach(() => {
    mutate.mockReset()
    mutate.mockResolvedValue({ undo: { op: 'restore', bundlePath: BUNDLE } })
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

  it('an archive whose re-spell couldn’t settle posts Archived “A” with its warning and Try Again', async () => {
    useSession.setState({ tree: makeTree() })
    mutate.mockResolvedValue({
      cascade: { pages: [], hosts: [], warning: 'Links weren’t updated.', owed: true },
      undo: { op: 'restore', bundlePath: BUNDLE },
    })
    await archive('page')
    expect(currentNotification()).toMatchObject({
      message: 'Archived “A”. Links weren’t updated.',
      tone: 'error',
      action: { label: 'Try Again' },
    })
  })

  it('archives nothing when the question is declined', async () => {
    useSession.setState({ tree: makeTree(), askConfirm: async () => false })
    await archive('page')
    expect(mutate).not.toHaveBeenCalled()
  })
})

describe('a bundle op through the slice', () => {
  it('a bundle op’s success posts nothing from the slice', async () => {
    useSession.setState({ mutate: useSession.getInitialState().mutate, tree: makeTree() })
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      mutate: async () =>
        ok({ unrestored: ['Beta'], cascade: { pages: [], hosts: [], warning: 'W' } }),
    })
    clearNotification()
    await useSession.getState().mutate({ op: 'restore', bundlePath: '.trash/b1' })
    expect(currentNotification()).toBeNull()
  })
})

describe('a batch through runBundled', () => {
  const channels = stubBrowserEachTest()
  const alpha = row({ title: 'Alpha' })
  const beta = row({ title: 'Beta' })
  const handed = (
    rows: BundleRow[],
    op: 'restore' | 'emptyBundle' = 'restore',
  ): Parameters<typeof runBundled>[1] =>
    rows.map((r) => ({ ...r, req: { op, bundlePath: r.bundlePath } }))
  const both = (op?: 'restore' | 'emptyBundle'): Parameters<typeof runBundled>[1] =>
    handed([alpha, beta], op)
  const armed = async (bundlePath: string): Promise<void> => {
    channels.mutated.mockResolvedValueOnce({
      ok: true,
      value: { undo: { op: 'restore', bundlePath } },
    })
    const req = { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' } as const
    await runBundled('Deleted', [{ title: 'Alpha', kind: 'page', req }])
  }

  beforeEach(() => {
    useSession.setState({ mutate: useSession.getInitialState().mutate })
    nexus('A')
  })

  it.each([
    ['Restored', 'restore'],
    ['Deleted', 'emptyBundle'],
  ] as const)('a batch %s spends the bundle’s Undo, so the chord reaches the entry beneath', async (verb, op) => {
    resetUndo()
    const older = vi.fn(() => true)
    pushUndo(older)
    await armed(alpha.bundlePath)
    channels.mutated.mockClear()
    await runBundled(verb, handed([alpha], op))
    expect(channels.mutated.mock.calls).toEqual([[{ op, bundlePath: alpha.bundlePath }]])
    expect(undoValue(null)).toBe(true)
    expect(older).toHaveBeenCalledTimes(1)
  })

  it('a refused restore leaves the bundle’s Undo on the chord', async () => {
    resetUndo()
    await armed(alpha.bundlePath)
    channels.mutated.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
    await runBundled('Restored', handed([alpha]))
    channels.mutated.mockClear()
    expect(undoValue(null)).toBe(true)
    await vi.waitFor(() =>
      expect(channels.mutated).toHaveBeenCalledWith({
        op: 'restore',
        bundlePath: alpha.bundlePath,
      }),
    )
  })

  it('a batch restore spends each bundle’s Undo', async () => {
    resetUndo()
    const older = vi.fn(() => true)
    pushUndo(older)
    await armed(beta.bundlePath)
    channels.mutated.mockClear()
    await runBundled('Restored', both())
    expect(channels.mutated).toHaveBeenCalledTimes(2)
    expect(undoValue(null)).toBe(true)
    expect(older).toHaveBeenCalledTimes(1)
  })

  it('a batch restore lands every pending save before its first restore', async () => {
    const order: string[] = []
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'page:updateBody': vi.fn(async (path: string) => {
        order.push(`save ${path}`)
        return { ok: true, value: { hash: 'h', stale: false } }
      }),
      mutate: vi.fn(async () => {
        order.push('mutate')
        return { ok: true, value: {} }
      }),
    })
    scheduleBodySave('Notes/A.md', 'typed', pageIO)
    await runBundled('Restored', both())
    expect(order).toEqual(['save Notes/A.md', 'mutate', 'mutate'])
  })

  it.each([
    ['Restored', 'restore', 'Couldn’t update links in “Alpha” across 1 Item.'],
    ['Deleted', 'emptyBundle', 'Couldn’t update links in 1 Item.'],
  ] as const)('carries what a batch %s couldn’t update into its notice', async (verb, op, warning) => {
    channels.mutated.mockResolvedValue({
      ok: true,
      value: { cascade: { pages: [], hosts: [], warning } },
    })
    await runBundled(verb, both(op))
    expect(currentNotification()).toMatchObject({
      message: `${verb} 2 Pages. ${warning}`,
      tone: 'error',
    })
  })

  it('counts the rows a batch empty couldn’t empty in its notice', async () => {
    channels.mutated
      .mockResolvedValueOnce({ ok: true, value: {} })
      .mockResolvedValueOnce({ ok: false, error: { code: 'io', message: 'No.' } })
    await runBundled('Deleted', both('emptyBundle'))
    expect(currentNotification()).toMatchObject({
      message: 'Deleted 1 Page. 1 Page couldn’t be deleted.',
      tone: 'error',
    })
  })

  it('names the title a restore stepped to', async () => {
    channels.mutated.mockResolvedValue({ ok: true, value: { landedAs: 'Alpha (2)' } })
    await runBundled('Restored', handed([alpha]))
    expect(currentNotification()).toMatchObject({
      message: 'Restored “Alpha” as “Alpha (2)”',
      tone: 'normal',
    })
  })

  it.each([
    ['Restored', 'restore', 'Restored “Alpha”'],
    ['Deleted', 'emptyBundle', 'Deleted “Alpha”'],
  ] as const)('a single row %s posts its title', async (verb, op, message) => {
    clearNotification()
    await runBundled(verb, handed([alpha], op))
    expect(currentNotification()).toMatchObject({ message, tone: 'normal' })
    expect(currentNotification()?.action).toBeUndefined()
  })

  const OWED = {
    ok: true,
    value: { cascade: { pages: [], hosts: [], warning: 'Couldn’t update 1 Item.', owed: true } },
  }
  const triesAgain = async (): Promise<void> => {
    expect(currentNotification()).toMatchObject({
      message: expect.stringContaining('Couldn’t update 1 Item.'),
      tone: 'error',
      action: { label: 'Try Again' },
    })
    channels.mutated.mockClear()
    await currentNotification()?.action?.run()
    await vi.waitFor(() => expect(channels.mutated).toHaveBeenCalledWith({ op: 'finishOwed' }))
  }

  it('a restore that stepped aside and owes work keeps Try Again on its notice', async () => {
    channels.mutated.mockResolvedValue({
      ok: true,
      value: { ...OWED.value, landedAs: 'Alpha (2)' },
    })
    await runBundled('Restored', handed([alpha]))
    await triesAgain()
  })

  it.each([
    ['Restored', 'restore'],
    ['Deleted', 'emptyBundle'],
  ] as const)('a batch %s with one owed reply offers Try Again on its notice', async (verb, op) => {
    channels.mutated.mockResolvedValueOnce({ ok: true, value: {} }).mockResolvedValueOnce(OWED)
    await runBundled(verb, both(op))
    await triesAgain()
  })

  it('a batch restore with one renamed names it in the segment', async () => {
    channels.mutated.mockResolvedValueOnce({ ok: true, value: { landedAs: 'Alpha (2)' } })
    await runBundled('Restored', both())
    expect(currentNotification()).toMatchObject({
      message: 'Restored 2 Pages',
      segment: '“Alpha” as “Alpha (2)”',
    })
  })

  it('a batch restore with several renamed counts them', async () => {
    channels.mutated
      .mockResolvedValueOnce({ ok: true, value: { landedAs: 'Alpha (2)' } })
      .mockResolvedValueOnce({ ok: true, value: { landedAs: 'Beta (2)' } })
    await runBundled('Restored', both())
    expect(currentNotification()).toMatchObject({ segment: '2 Renamed' })
  })

  it('a Nexus switch during a batch stops it, posting no notice and telling the stores once, and one during its last row posts nothing', async () => {
    clearNotification()
    const heard = vi.fn()
    const unsubscribe = storesChanged.subscribe(heard)
    channels.mutated.mockImplementationOnce(async () => {
      nexus('C')
      return { ok: true, value: {} }
    })
    await runBundled('Restored', both())
    unsubscribe()
    expect(channels.mutated).toHaveBeenCalledTimes(1)
    expect(currentNotification()).toBeNull()
    expect(heard).toHaveBeenCalledTimes(1)
    channels.mutated.mockClear()
    channels.mutated.mockImplementation(async () => {
      if (channels.mutated.mock.calls.length === 2) nexus('D')
      return { ok: true, value: {} }
    })
    await runBundled('Restored', both())
    expect(channels.mutated).toHaveBeenCalledTimes(2)
    expect(currentNotification()).toBeNull()
    channels.mutated.mockClear()
    expect(await runBundled('Restored', both(), 'gone')).toBe(false)
    expect(channels.mutated).not.toHaveBeenCalled()
  })
})

describe('a delete’s question', () => {
  it('asks of one row by its title, of more by their count, Items where the kinds mix', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({})
    switchOn()
    await askTrashing([row({ title: 'Ideas' })])
    await askTrashing([row({}), row({})])
    await askTrashing([row({}), row({ kind: 'set' })])
    expect(asked).toEqual(['Delete “Ideas”?', 'Delete these 2 Pages?', 'Delete these 2 Items?'])
  })
})
