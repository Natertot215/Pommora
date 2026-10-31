// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { filterRows, outermostOf, treeRows, useBundleBrowser } from './browser'
import { widestDate } from './BundleTable'
import type { BundleRow } from './rows'
import { bundleRow as row, stubBrowserEachTest } from '../Testing/bundles'
import { storesChanged } from '../Session/nexusSlice'
import {
  type ActionBar,
  clearNotification,
  currentNotification,
  useActionBar,
} from '../Interface/Notifications/notifications'
import { runBundled } from '../Interface/Confirm/confirmations'
import { pushUndo, resetUndo, undoValue } from '../Session/undo'
import type { MutateRequest } from '../Nexus/mutateRequest'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('filterRows', () => {
  const rows = [
    row({ title: 'Alpha', crumbs: [{ kind: 'collection', title: 'Notes' }] }),
    row({ title: 'Beta', crumbs: [{ kind: 'collection', title: 'Journals' }] }),
    row({ title: 'Gamma', crumbs: [] }),
  ]

  it('an empty query keeps the list whole and in the order it arrived', () => {
    expect(filterRows(rows, '').map((r) => r.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(filterRows(rows, '   ')).toBe(rows)
  })

  it('matches a title', () => {
    expect(filterRows(rows, 'bet').map((r) => r.title)).toEqual(['Beta'])
  })

  it('matches a location, so a row is findable by where it lived', () => {
    expect(filterRows(rows, 'journ').map((r) => r.title)).toEqual(['Beta'])
  })

  it('matches a location and a title together, a / reading as a word break', () => {
    expect(filterRows(rows, 'notes/alpha').map((r) => r.title)).toEqual(['Alpha'])
  })

  it('a query nothing answers yields nothing', () => {
    expect(filterRows(rows, 'zzz')).toEqual([])
  })

  it('a row with no location is still matched on its title alone', () => {
    expect(filterRows(rows, 'gamma').map((r) => r.title)).toEqual(['Gamma'])
  })

  it('narrows in place, keeping the order it arrived in rather than ranking the best match first', () => {
    const listed = [
      row({ title: 'Notes Archive', crumbs: [] }),
      row({ title: 'Notes', crumbs: [] }),
    ]
    expect(filterRows(listed, 'notes').map((r) => r.title)).toEqual(['Notes Archive', 'Notes'])
  })
})

describe('widestDate', () => {
  it('a style showing the weekday and the time runs September’s Wednesday the 30th at 12:00 PM', () => {
    const sample = widestDate({ date_format: 'full', time_format: 'twelveHour', weekday: 'long' })
    for (const part of ['Wednesday', 'September', '30th', '12:00 PM'])
      expect(sample).toContain(part)
  })

  it('a style without them leaves the weekday and the time out', () => {
    const sample = widestDate({ date_format: 'full', time_format: 'none', weekday: 'none' })
    expect(sample).toContain('September 30th')
    for (const part of ['Wednesday', '12:00']) expect(sample).not.toContain(part)
  })

  it('a relative style runs a week ago with its clock, else a year’s last month', () => {
    expect(
      widestDate({ date_format: 'relative', time_format: 'twelveHour', weekday: 'none' }),
    ).toBe('7 Days Ago at 12:00 PM')
    expect(widestDate({ date_format: 'relative', time_format: 'none', weekday: 'none' })).toBe(
      '12 Months Ago',
    )
  })
})

describe('treeRows', () => {
  const set = row({ title: 'S', kind: 'set', bundlePath: '.trash/S.deleted' })
  const nested = row({ title: 'T', kind: 'set', bundlePath: '.trash/S.deleted/S/T' })
  const page = row({ title: 'P', bundlePath: '.trash/S.deleted/S/T/P.md' })
  const loose = row({ title: 'Q', bundlePath: '.trash/Q.deleted' })

  it('sets each row’s depth, its open state, and null for a page', () => {
    const open = new Map([
      [set.bundlePath, [nested]],
      [nested.bundlePath, [page]],
    ])
    expect(treeRows([set, loose], open)).toEqual([
      { row: set, depth: 0, open: true },
      { row: nested, depth: 1, open: true },
      { row: page, depth: 2, open: null },
      { row: loose, depth: 0, open: null },
    ])
  })

  it('lists inner rows beneath an open parent only', () => {
    const open = new Map([[nested.bundlePath, [page]]])
    expect(treeRows([set, loose], open)).toEqual([
      { row: set, depth: 0, open: false },
      { row: loose, depth: 0, open: null },
    ])
  })
})

describe('outermostOf', () => {
  it('acts once on a checked Set and its checked page, keeping siblings and look-alike prefixes', () => {
    const b = row({ title: 'B', kind: 'set', bundlePath: 'A/B' })
    const inB = row({ title: 'P', bundlePath: 'A/B/P.md' })
    const bc = row({ title: 'Bc', bundlePath: 'A/Bc' })
    const sibling = row({ title: 'C', bundlePath: 'A/C' })
    expect(outermostOf([b, inB, bc, sibling])).toEqual([b, bc, sibling])
  })
})

describe('a browser’s remembered checks', () => {
  const set = row({ title: 'S', kind: 'set', bundlePath: '.trash/S.deleted', homeResolves: false })
  const page = row({ title: 'P', bundlePath: '.trash/S.deleted/S/P.md', homeResolves: false })
  const nested = row({ title: 'T', kind: 'set', bundlePath: '.trash/S.deleted/S/T' })
  const deeper = row({ title: 'U', kind: 'set', bundlePath: '.trash/S.deleted/S/T/U' })
  let host: HTMLDivElement
  let root: Root
  let browser: ReturnType<typeof useBundleBrowser>
  let bar: ActionBar | null
  let replies: ((lists: BundleRow[][]) => void)[]
  const children = vi.fn(
    () => new Promise((resolve) => replies.push((lists) => resolve({ ok: true, value: lists }))),
  )
  const channels = stubBrowserEachTest(() => ({ 'bundles:children': children }))

  const Harness = (): null => {
    browser = useBundleBrowser({ kind: 'trash' }, { query: '', shown: true })
    bar = useActionBar()
    return null
  }
  const click = (target: BundleRow): Promise<void> => act(async () => browser.rowClick(target, 1))
  const reply = (...lists: BundleRow[][]): Promise<void> =>
    act(async () => replies.shift()?.(lists))
  const relist = (): Promise<void> => act(async () => storesChanged.emit())
  const shown = (): string[] => browser.visible.map((t) => t.row.title)

  beforeEach(async () => {
    replies = []
    channels.listed = [set]
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root.render(createElement(Harness)))
    await click(set)
    await reply([page])
    await act(async () => browser.toggle(page.bundlePath))
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    useSession.setState({ tree: null })
  })

  it('keeps an inner row’s check while its container is collapsed, out of the batch, and shows it again on reopening', async () => {
    expect(browser.picked).toEqual([page])
    await click(set)
    expect(shown()).toEqual(['S'])
    expect(browser.checked.has(page.bundlePath)).toBe(true)
    expect(browser.picked).toEqual([])
    await click(set)
    await reply([page])
    expect(shown()).toEqual(['S', 'P'])
    expect(browser.picked).toEqual([page])
  })

  it('keeps a check its reopened container no longer lists until the next listing drops it', async () => {
    await click(set)
    await click(set)
    await reply([])
    expect(browser.checked.has(page.bundlePath)).toBe(true)
    await relist()
    await reply([])
    expect(browser.checked.has(page.bundlePath)).toBe(false)
  })

  it('a listing asks once for every open container and keeps the checks their replies still list', async () => {
    await click(set)
    await click(set)
    await reply([nested, page])
    await click(nested)
    await reply([deeper])
    children.mockClear()
    await relist()
    expect(children.mock.calls).toEqual([[[set.bundlePath, nested.bundlePath]]])
    await reply([nested, page], [deeper])
    expect(browser.checked.has(page.bundlePath)).toBe(true)
    expect(shown()).toEqual(['S', 'T', 'U', 'P'])
  })

  it('a listing whose reply no longer lists a checked inner row drops its check', async () => {
    await relist()
    await reply([])
    expect(browser.checked.has(page.bundlePath)).toBe(false)
  })

  it('a container closed while a listing’s reply is in flight stays closed', async () => {
    await relist()
    await click(set)
    await reply([page])
    expect(browser.visible).toEqual([{ row: set, depth: 0, open: false }])
  })

  it('closing a container forgets its open descendants two levels deep', async () => {
    await click(set)
    await click(set)
    await reply([nested])
    await click(nested)
    await reply([deeper])
    await click(deeper)
    await reply([])
    await click(set)
    await click(set)
    await reply([nested])
    await click(nested)
    await reply([deeper])
    expect(browser.visible.map((t) => t.open)).toEqual([true, true, false])
  })

  it('a container’s click, a keyboard’s with no count among them, folds or discloses it without checking it, and a double-click’s second click leaves it open; a keyboard’s click toggles a page', async () => {
    await act(async () => browser.rowClick(set, 0))
    expect(browser.visible).toEqual([{ row: set, depth: 0, open: false }])
    await click(set)
    await reply([page])
    await act(async () => browser.rowClick(set, 2))
    expect(shown()).toEqual(['S', 'P'])
    expect(browser.checked.has(set.bundlePath)).toBe(false)
    await act(async () => browser.rowClick(page, 0))
    expect(browser.checked.has(page.bundlePath)).toBe(false)
  })

  it('a page’s double-click leaves it checked, whether or not it started checked', async () => {
    await act(async () => browser.rowClick(page, 2))
    expect(browser.checked.has(page.bundlePath)).toBe(true)
    await act(async () => browser.toggle(page.bundlePath))
    await act(async () => browser.rowClick(page, 2))
    expect(browser.checked.has(page.bundlePath)).toBe(true)
  })

  it('a checked Set and its checked page reach the bar once, as the Set', async () => {
    useSession.setState({ tree: makeTree() })
    channels.picked = 'c1'
    clearNotification()
    await act(async () => browser.toggle(set.bundlePath))
    expect(browser.picked).toEqual([set])
    await act(async () => bar?.restore())
    await vi.waitFor(() => expect(currentNotification()?.message).toBe('Restored “S”'))
    expect(channels.mutated.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: set.bundlePath, destination: { kind: 'container', id: 'c1' } }],
    ])
  })

  it.each([
    'restore',
    'delete',
  ])('a row’s %s hands its bundle to runBundled, spending the Undo armed on it', async (action) => {
    const alpha = row({ title: 'Alpha' })
    useSession.setState({ tree: makeTree(), askConfirm: async () => true })
    resetUndo()
    const older = vi.fn(() => true)
    pushUndo(older)
    channels.mutated.mockResolvedValueOnce({
      ok: true,
      value: { undo: { op: 'restore', bundlePath: alpha.bundlePath } },
    })
    const req = { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' } as const
    await act(async () => {
      await runBundled('Deleted', [{ title: 'Alpha', kind: 'page', req }])
    })
    channels.picked = action
    await act(async () => browser.openMenu(alpha))
    expect(undoValue(null)).toBe(true)
    expect(older).toHaveBeenCalledTimes(1)
  })

  it('a batch of a homeless Space, two homeless inner pages, and a homed page asks once per kind and sends each homeless row its own, the homed one going with none, and a dismissed second ask restores nothing', async () => {
    useSession.setState({ tree: makeTree() })
    const space = row({
      title: 'W',
      kind: 'space',
      bundlePath: '.trash/W.deleted',
      homeResolves: false,
    })
    const stray = row({ title: 'R', bundlePath: '.trash/S.deleted/S/R.md', homeResolves: false })
    const homed = row({ title: 'H', bundlePath: '.trash/H.deleted' })
    channels.listed = [space, set, homed]
    await relist()
    await reply([page, stray])
    for (const target of [space, stray, homed])
      await act(async () => browser.toggle(target.bundlePath))
    const answer = (value: string | null) => ({ ok: true, value })
    channels.menu
      .mockResolvedValueOnce(answer('restore'))
      .mockResolvedValueOnce(answer('g1'))
      .mockResolvedValueOnce(answer(null))
    await act(async () => browser.openMenu(page))
    expect(channels.menu).toHaveBeenCalledTimes(3)
    expect(channels.mutated).not.toHaveBeenCalled()
    channels.menu
      .mockResolvedValueOnce(answer('restore'))
      .mockResolvedValueOnce(answer('g1'))
      .mockResolvedValueOnce(answer('c1'))
    await act(async () => browser.openMenu(page))
    expect(channels.mutated.mock.calls.map(([req]) => req)).toStrictEqual([
      { op: 'restore', bundlePath: space.bundlePath, destination: { kind: 'context', id: 'g1' } },
      { op: 'restore', bundlePath: page.bundlePath, destination: { kind: 'container', id: 'c1' } },
      { op: 'restore', bundlePath: stray.bundlePath, destination: { kind: 'container', id: 'c1' } },
      { op: 'restore', bundlePath: homed.bundlePath },
    ])
  })

  it('a right-click on a checked inner page under its checked parent offers the parent’s destinations and restores the parent', async () => {
    useSession.setState({ tree: makeTree() })
    await act(async () => browser.toggle(set.bundlePath))
    channels.menu.mockResolvedValueOnce({ ok: true, value: 'restoreTo:c1' })
    await act(async () => browser.openMenu(page))
    expect(channels.menu.mock.calls[0][0].items[0]).toMatchObject({
      label: 'Restore',
      submenu: [{ label: 'Notes' }],
    })
    expect(channels.mutated.mock.calls.map(([req]) => req)).toEqual([
      { op: 'restore', bundlePath: set.bundlePath, destination: { kind: 'container', id: 'c1' } },
    ])
  })

  it('leaves a container closed when its reply lands after it closed', async () => {
    await click(set)
    await click(set)
    await click(set)
    await reply([page])
    expect(browser.visible).toEqual([{ row: set, depth: 0, open: false }])
  })
})

describe('an Archive restore’s Undo', () => {
  const ARCHIVED = '.nexus/archive/c1/Notes'
  const alpha = row({
    title: 'Alpha',
    bundlePath: `${ARCHIVED}/2026-10-17T00-00-00-000Z__Alpha.md.archived`,
  })
  const beta = row({
    title: 'Beta',
    bundlePath: `${ARCHIVED}/Ideas/2026-10-17T00-00-00-000Z__Beta.md.archived`,
  })
  const recordOf = (id: string) => ({ entity: 'page', id, parent: { kind: 'container', id: 's1' } })
  const undoOf = (target: BundleRow, id: string, path: string): MutateRequest => ({
    op: 'archive',
    path,
    kind: 'page',
    back: { at: target.bundlePath, name: `${target.title}.md`, record: recordOf(id) },
  })
  const alphaUndo = undoOf(alpha, 'p1', 'Notes/Alpha.md')
  const betaUndo = undoOf(beta, 'p2', 'Notes/Ideas/Beta.md')
  let host: HTMLDivElement
  let root: Root
  let browser: ReturnType<typeof useBundleBrowser>
  const channels = stubBrowserEachTest()

  const Harness = (): null => {
    browser = useBundleBrowser({ kind: 'archive', id: 'c1' }, { query: '', shown: true })
    return null
  }

  beforeEach(async () => {
    channels.listed = [alpha, beta]
    channels.picked = 'restore'
    channels.mutated.mockImplementation(async (req: MutateRequest) => {
      const undo =
        req.op === 'restore' &&
        (req.bundlePath === alpha.bundlePath
          ? alphaUndo
          : req.bundlePath === beta.bundlePath && betaUndo)
      return { ok: true, value: undo ? { undo } : {} }
    })
    useSession.setState({ tree: makeTree() })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root.render(createElement(Harness)))
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    useSession.setState({ tree: null })
  })

  it('an Archive restore’s Undo sends each reply’s own request at the item’s place now, followed by the id its record carries', async () => {
    await act(async () => browser.toggle(alpha.bundlePath))
    await act(async () => browser.toggle(beta.bundlePath))
    await act(async () => browser.openMenu(alpha))
    const renamed = makeTree()
    renamed.collections[0].pages[0] = {
      kind: 'page',
      id: 'p1',
      title: 'Alpha 2',
      path: 'Notes/Alpha 2.md',
    }
    useSession.setState({ tree: renamed })
    channels.mutated.mockClear()
    await act(async () => currentNotification()?.action?.run())
    expect(channels.mutated.mock.calls.map(([req]) => req)).toEqual([
      {
        ...alphaUndo,
        path: 'Notes/Alpha 2.md',
        back: { at: alpha.bundlePath, name: 'Alpha 2.md', record: recordOf('p1') },
      },
      betaUndo,
    ])
    await act(async () => browser.toggle(alpha.bundlePath))
    await act(async () => browser.openMenu(beta))
    channels.mutated.mockClear()
    await act(async () => currentNotification()?.action?.run())
    expect(channels.mutated.mock.calls.map(([req]) => req)).toEqual([betaUndo])
  })
})
