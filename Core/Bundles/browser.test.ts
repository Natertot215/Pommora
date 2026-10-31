// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { filterRows, outermostOf, treeRows, useBundleBrowser, widestDate } from './browser'
import type { BundleRow } from './rows'
import { bundleRow as row } from '../Testing/fixtures'
import { stubDialer } from '../vitest.setup'
import { storesChanged } from '../Session/nexusSlice'
import { currentNotification } from '../Interface/Notifications/notifications'
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
  let replies: ((lists: BundleRow[][]) => void)[]
  let children: ReturnType<typeof vi.fn>
  let listed: BundleRow[]
  let menu: ReturnType<typeof vi.fn>
  let mutated: ReturnType<typeof vi.fn>

  const Harness = (): null => {
    browser = useBundleBrowser({ kind: 'trash' }, { query: '', shown: true })
    return null
  }
  const click = (target: BundleRow): Promise<void> => act(async () => browser.rowClick(target, 1))
  const reply = (...lists: BundleRow[][]): Promise<void> =>
    act(async () => replies.shift()?.(lists))
  const relist = (): Promise<void> => act(async () => storesChanged.emit())
  const shown = (): string[] => browser.visible.map((t) => t.row.title)

  beforeEach(async () => {
    replies = []
    listed = [set]
    menu = vi.fn(async () => ({ ok: true, value: null }))
    mutated = vi.fn(async () => ({ ok: true, value: {} }))
    children = vi.fn(
      () => new Promise((resolve) => replies.push((lists) => resolve({ ok: true, value: lists }))),
    )
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      menu,
      mutate: mutated,
      'bundles:list': vi.fn(async () => ({ ok: true, value: listed })),
      'bundles:children': children,
    })
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

  it('a keyboard’s click, with no count, discloses a container and toggles a page', async () => {
    await act(async () => browser.rowClick(set, 0))
    expect(shown()).toEqual(['S'])
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
    await act(async () => browser.toggle(set.bundlePath))
    expect(browser.picked).toEqual([set])
  })

  it('a batch of a homeless Space and a homeless page asks once per kind and sends each its own, and a dismissed second ask restores nothing', async () => {
    useSession.setState({ tree: makeTree() })
    const space = row({
      title: 'W',
      kind: 'space',
      bundlePath: '.trash/W.deleted',
      homeResolves: false,
    })
    const answer = (value: string | null) => ({ ok: true, value })
    menu.mockResolvedValueOnce(answer('g1')).mockResolvedValueOnce(answer(null))
    await act(async () => browser.restore([space, page]))
    expect(menu).toHaveBeenCalledTimes(2)
    expect(mutated).not.toHaveBeenCalled()
    menu.mockResolvedValueOnce(answer('g1')).mockResolvedValueOnce(answer('c1'))
    await act(async () => browser.restore([space, page]))
    expect(mutated.mock.calls.map(([req]) => req)).toEqual([
      { op: 'restore', bundlePath: space.bundlePath, destination: { kind: 'context', id: 'g1' } },
      { op: 'restore', bundlePath: page.bundlePath, destination: { kind: 'container', id: 'c1' } },
    ])
  })

  it('a right-click on a checked inner page under its checked parent offers the parent’s destinations and restores the parent', async () => {
    useSession.setState({ tree: makeTree() })
    await act(async () => browser.toggle(set.bundlePath))
    menu.mockResolvedValueOnce({ ok: true, value: 'restoreTo:c1' })
    await act(async () => browser.openMenu(page))
    expect(menu.mock.calls[0][0].items[0]).toMatchObject({
      label: 'Restore',
      submenu: [{ label: 'Notes' }],
    })
    expect(mutated.mock.calls.map(([req]) => req)).toEqual([
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
  let mutated: ReturnType<typeof vi.fn>

  const Harness = (): null => {
    browser = useBundleBrowser({ kind: 'archive', id: 'c1' }, { query: '', shown: true })
    return null
  }

  beforeEach(async () => {
    mutated = vi.fn(async (req: MutateRequest) => {
      const undo =
        req.op === 'restore' &&
        (req.bundlePath === alpha.bundlePath
          ? alphaUndo
          : req.bundlePath === beta.bundlePath && betaUndo)
      return { ok: true, value: undo ? { undo } : {} }
    })
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      mutate: mutated,
      'bundles:list': vi.fn(async () => ({ ok: true, value: [alpha, beta] })),
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
    await act(async () => browser.restore([alpha, beta]))
    const renamed = makeTree()
    renamed.collections[0].pages[0] = {
      kind: 'page',
      id: 'p1',
      title: 'Alpha 2',
      path: 'Notes/Alpha 2.md',
    }
    useSession.setState({ tree: renamed })
    mutated.mockClear()
    await act(async () => currentNotification()?.action?.run())
    expect(mutated.mock.calls.map(([req]) => req)).toEqual([
      {
        ...alphaUndo,
        path: 'Notes/Alpha 2.md',
        back: { at: alpha.bundlePath, name: 'Alpha 2.md', record: recordOf('p1') },
      },
      betaUndo,
    ])
    await act(async () => browser.restore([beta]))
    mutated.mockClear()
    await act(async () => currentNotification()?.action?.run())
    expect(mutated.mock.calls.map(([req]) => req)).toEqual([betaUndo])
  })
})
