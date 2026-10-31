// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { BundleRow } from '../Bundles/rows'
import { ArchiveView } from './ArchiveView'
import { boxOf, bundleRow, press, rowOf, stubBrowserEachTest } from '../Testing/bundles'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { ContentHostContext } from '../Interface/contentHost'
import { ActionLabel } from '../Interface/Notifications/ActionLabel'
import { PageReaderWindow } from '../Interface/Windows/PageReaderWindow'
import { clearNotification, currentNotification } from '../Interface/Notifications/notifications'
import { resetUndo } from '../Session/undo'
import { storesChanged } from '../Session/nexusSlice'
import { captureWarm, clearWarm } from '../Session/warmCache'
import type { CollectionNode, SetNode } from '../Nexus/tree'

vi.mock('@pommora/uix/Interactions/virtualRows', () => import('../Testing/virtualRows'))
vi.mock('../MarkdownPM/MarkdownEditor', () => ({
  MarkdownEditor: (p: { initialBody: string }) =>
    createElement('div', { className: 'stub-editor' }, p.initialBody),
}))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const archived = (title: string, over: Partial<BundleRow> = {}): BundleRow => {
  const bundlePath = `.nexus/archive/c1/Notes/2026-10-20T12-00-00-000Z__${title}.md.archived`
  return bundleRow({
    title,
    bundlePath,
    stored: { id: `id-${title}`, path: `${bundlePath}/${title}.md` },
    ...over,
  })
}

const SET_BUNDLE = '.nexus/archive/c1/Notes/2026-10-20T12-00-00-000Z__Ideas.archived'

const archivedSet = (): BundleRow =>
  bundleRow({ title: 'Ideas', kind: 'set', bundlePath: SET_BUNDLE })

const inner = (title: string, over: Partial<BundleRow> = {}): BundleRow => {
  const bundlePath = `${SET_BUNDLE}/Ideas/${title}.md`
  return bundleRow({
    title,
    bundlePath,
    stored: { id: `id-${title}`, path: bundlePath },
    crumbs: [
      { kind: 'collection', title: 'Notes' },
      { kind: 'set', title: 'Ideas' },
    ],
    ...over,
  })
}

describe('ArchiveView', () => {
  let host: HTMLDivElement
  let root: Root
  let readable: boolean
  const channels = stubBrowserEachTest(() => ({
    'page:open': vi.fn(async () =>
      readable
        ? { ok: true, value: { body: 'Root body.' } }
        : { ok: false, error: { code: 'not-found', message: 'gone' } },
    ),
  }))
  const tree = makeTree()
  const collection = tree.collections[0] as CollectionNode
  const set = collection.sets[0] as SetNode

  const render = async (owner: CollectionNode | SetNode = collection, parked = false) =>
    act(async () =>
      root.render(
        <>
          <ContentHostContext.Provider value={{ tabId: 't1', key: `archive:${owner.id}`, parked }}>
            <ArchiveView owner={owner} archiveId={collection.id} />
          </ContentHostContext.Provider>
          <ActionLabel />
          <PageReaderWindow />
        </>,
      ),
    )
  const rowEls = (): HTMLElement[] => [
    ...host.querySelectorAll<HTMLElement>('.bundle-rows .data-row'),
  ]
  const titles = (): string[] =>
    rowEls().map((r) => r.querySelector('.cell-title-text')?.textContent ?? '')
  const empty = (): string | null => host.querySelector('.archive-empty')?.textContent ?? null
  const face = (): Element | null =>
    host.querySelector('[role=status] [data-face="shown"], [role=alert] [data-face="shown"]')
  const barButton = (label: 'Restore' | 'Delete'): HTMLElement =>
    [...(face()?.querySelectorAll('button') ?? [])].find((b) =>
      label === 'Delete' ? b.getAttribute('title') === 'Delete' : b.textContent === label,
    ) as HTMLElement
  const pressBar = async (label: 'Restore' | 'Delete'): Promise<void> => {
    const button = barButton(label)
    await act(async () => button.click())
  }
  const check = async (...rows: string[]): Promise<void> => {
    for (const title of rows) await act(async () => rowOf(host, title).click())
  }
  const doubleClick = async (title: string): Promise<void> => {
    await press(host, title, 1)
    await press(host, title, 2)
    await act(async () => {
      rowOf(host, title).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
  }
  const undo = async (): Promise<void> => {
    channels.mutated.mockClear()
    await act(async () => {
      currentNotification()?.action?.run()
      await new Promise((settle) => setTimeout(settle, 0))
    })
  }

  beforeEach(async () => {
    channels.listed = [archived('A', { stored: { id: 'p1', path: 'x/A.md' } })]
    readable = true
    useSession.setState({ tree, viewSearch: {}, reader: null, askConfirm: async () => true })
    host = document.body.appendChild(document.createElement('div'))
    root = createRoot(host)
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    clearNotification()
    resetUndo()
    useSession.setState({ tree: null, viewSearch: {}, reader: null })
  })

  it('lists each archived item with the trail it left under its title and its archived time, newest first', async () => {
    channels.listed = [
      archived('Newer', {
        storedAt: Date.UTC(2026, 9, 20),
        crumbs: [
          { kind: 'collection', title: 'Notes' },
          { kind: 'set', title: 'Ideas' },
        ],
      }),
      archived('Older', { storedAt: Date.UTC(2026, 9, 10) }),
    ]
    await render()
    expect(channels.list).toHaveBeenCalledWith({ kind: 'archive', id: 'c1' }, undefined)
    expect(titles()).toEqual(['Newer', 'Older'])
    expect(rowOf(host, 'Newer').querySelector('.bundle-trail')?.textContent).toBe('Notes›Ideas')
    const dates = rowEls().map((r) => r.querySelector('.bundle-date')?.textContent ?? '')
    expect(dates.every((d) => d !== '')).toBe(true)
    expect(dates[0]).not.toBe(dates[1])
  })

  it('its Title and Archived headings each wear their type’s glyph, as a table’s headings do', async () => {
    await render()
    const heads = [...host.querySelectorAll('.table-head .col-header')]
    expect(heads.map((h) => h.querySelectorAll('.col-header-icon svg').length)).toEqual([1, 1])
  })

  it('a page row’s click checks it, and its double-click opens the reader titled by its trail under the filled lock, leaving it checked whether or not it started checked', async () => {
    await render()
    await press(host, 'A', 1)
    expect(boxOf(host, 'A').getAttribute('aria-checked')).toBe('true')
    expect(useSession.getState().reader).toBeNull()
    await press(host, 'A', 1)
    expect(boxOf(host, 'A').getAttribute('aria-checked')).toBe('false')
    await doubleClick('A')
    expect(boxOf(host, 'A').getAttribute('aria-checked')).toBe('true')
    expect(useSession.getState().reader).toEqual({
      kind: 'archive',
      page: { kind: 'page', id: 'p1', path: 'x/A.md' },
      trail: [expect.objectContaining({ title: 'Notes' }), expect.objectContaining({ title: 'A' })],
    })
    expect(host.querySelector('.reader-lock svg rect[fill="currentColor"]')).not.toBeNull()
    await act(async () => useSession.setState({ reader: null }))
    await doubleClick('A')
    expect(boxOf(host, 'A').getAttribute('aria-checked')).toBe('true')
    expect(useSession.getState().reader?.page).toEqual({ kind: 'page', id: 'p1', path: 'x/A.md' })
  })

  it('Enter discloses a Set and opens a page’s reader, leaving it checked', async () => {
    channels.listed = [archivedSet(), archived('A')]
    channels.children = { [SET_BUNDLE]: [inner('P')] }
    await render()
    const key = async (title: string, k: string): Promise<void> =>
      act(async () => {
        rowOf(host, title).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
      })
    expect(titles()).toEqual(['Ideas', 'A'])
    await key('Ideas', 'Enter')
    expect(titles()).toEqual(['Ideas', 'P', 'A'])
    expect(boxOf(host, 'A').getAttribute('aria-checked')).toBe('false')
    expect(useSession.getState().reader).toBeNull()
    await key('A', 'Enter')
    expect(boxOf(host, 'A').getAttribute('aria-checked')).toBe('true')
    expect(useSession.getState().reader?.page).toMatchObject({ kind: 'page', id: 'id-A' })
  })

  it('an inner page’s double-click opens the reader titled by its row’s trail, then the page', async () => {
    channels.listed = [archivedSet()]
    channels.children = { [SET_BUNDLE]: [inner('P')] }
    await render()
    await press(host, 'Ideas', 1)
    await doubleClick('P')
    expect(useSession.getState().reader).toEqual(
      expect.objectContaining({
        trail: ['Notes', 'Ideas', 'P'].map((title) => expect.objectContaining({ title })),
      }),
    )
  })

  it('a double-click on a page’s box opens nothing', async () => {
    await render()
    const box = boxOf(host, 'A')
    for (const detail of [1, 2])
      await act(async () => {
        box.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
      })
    await act(async () => {
      box.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(useSession.getState().reader).toBeNull()
  })

  it('publishes the count of top rows, whatever an open Set discloses', async () => {
    channels.listed = [archivedSet(), archived('A')]
    channels.children = { [SET_BUNDLE]: [inner('P'), inner('Q')] }
    await render()
    await press(host, 'Ideas', 1)
    expect(titles()).toEqual(['Ideas', 'P', 'Q', 'A'])
    expect(useSession.getState().detailCount).toBe(2)
  })

  it('the header names its owner with Archive in its trailing slot after the search’s clear button', async () => {
    await render()
    const header = host.querySelector('.detail-title')
    expect(header?.querySelector('.detail-title-text')?.textContent).toBe('Notes')
    expect(header?.lastElementChild?.className).toBe('detail-title-trailing')
    expect(header?.lastElementChild?.textContent).toBe('Archive')
    expect(
      header?.lastElementChild?.previousElementSibling?.classList.contains('detail-title-clear'),
    ).toBe(true)
  })

  it('draws its owner’s title with no banner image and no add-banner button', async () => {
    await render({ ...collection, banner: 'assets/cover.png' })
    expect(host.querySelector('.banner')).toBeNull()
    expect(host.querySelector('[aria-label="Add banner"]')).toBeNull()
    expect(host.querySelector('.banner-empty .detail-title-text')?.textContent).toBe('Notes')
  })

  it('an empty archive reads its one line and leaves no Tab stop', async () => {
    channels.listed = []
    await render()
    expect(empty()).toBe("This Collection's archive is empty.")
    expect(host.querySelector('.line-zone')).toBeNull()
  })

  it('a top-level Set’s empty archive reads the Set’s line', async () => {
    channels.listed = []
    await render(set)
    expect(channels.list).toHaveBeenCalledWith({ kind: 'archive', id: 'c1' }, 's1')
    expect(empty()).toBe("This Set's archive is empty.")
  })

  it('a listing that fails reads its one line and draws no rows or Tab stop', async () => {
    await render()
    expect(titles()).toEqual(['A'])
    channels.list.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
    await act(async () => storesChanged.emit())
    expect(titles()).toEqual([])
    expect(empty()).toBe("The archive couldn't be read.")
    expect(host.querySelector('.line-zone')).toBeNull()
  })

  it('narrows in place by the tab’s search, keeping archived order', async () => {
    channels.listed = [archived('Beta Two'), archived('Alpha'), archived('Beta One')]
    await render()
    await act(async () =>
      useSession.setState({ viewSearch: { t1: { key: 'archive:c1', query: 'beta', summon: 0 } } }),
    )
    expect(titles()).toEqual(['Beta Two', 'Beta One'])
  })

  it('a search that hides every row reads Nothing matches. and leaves no Tab stop', async () => {
    await render()
    expect(empty()).toBeNull()
    await act(async () =>
      useSession.setState({ viewSearch: { t1: { key: 'archive:c1', query: 'zzz', summon: 0 } } }),
    )
    expect(titles()).toEqual([])
    expect(empty()).toBe('Nothing matches.')
    expect(host.querySelector('.line-zone')).toBeNull()
  })

  it('declares its bar while rows are checked, reading their count, and withdraws it when parked', async () => {
    channels.listed = [archived('A'), archived('B')]
    await render()
    expect(host.querySelector('[role=status]')?.hasAttribute('inert')).toBe(true)
    await check('A', 'B')
    expect(face()?.textContent).toBe('Restore2 Pages')
    await render(collection, true)
    expect(host.querySelector('[role=status]')?.hasAttribute('inert')).toBe(true)
  })

  it('a right-click Delete moves the row into the Trash with an Undo that returns it to the Archive', async () => {
    const { bundlePath } = channels.listed[0]
    const trashed = '.trash/Notes/2026-10-21T12-00-00-000Z__A.md.deleted'
    const undoReq = {
      op: 'restore',
      bundlePath: trashed,
      destination: { kind: 'archive', at: bundlePath },
    }
    channels.mutated.mockResolvedValue({ ok: true, value: { undo: undoReq } })
    await render()
    channels.picked = 'delete'
    await act(async () => {
      rowOf(host, 'A').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(channels.mutated.mock.calls).toEqual([
      [{ op: 'delete', path: bundlePath, kind: 'page' }],
    ])
    expect(currentNotification()?.message).toBe('Deleted “A”')
    await undo()
    expect(channels.mutated.mock.calls).toEqual([[undoReq]])
  })

  it('the bar’s Restore of one row posts Restored “A”, and of two Restored 2 Pages, whose Undo sends each reply’s own request where the tree now holds the item', async () => {
    channels.listed = [
      archived('A', { stored: { id: 'p1', path: 'x/A.md' } }),
      archived('B', { stored: { id: 'p2', path: 'x/B.md' } }),
    ]
    const undoOf = (bundlePath: string, path: string) => ({
      op: 'archive',
      path,
      kind: 'page',
      back: { at: bundlePath, name: path.split('/').at(-1), record: {} },
    })
    const landed = ['Notes/Alpha.md', 'Notes/Ideas/Beta.md']
    channels.mutated.mockImplementation(
      async ({ op, bundlePath }: { op: string; bundlePath: string }) => {
        const at = channels.listed.findIndex((r) => r.bundlePath === bundlePath)
        return { ok: true, value: op === 'restore' ? { undo: undoOf(bundlePath, landed[at]) } : {} }
      },
    )
    await render()
    await check('A')
    await pressBar('Restore')
    expect(channels.mutated.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: channels.listed[0].bundlePath }],
    ])
    expect(currentNotification()?.message).toBe('Restored “A”')
    act(() => clearNotification())
    await check('B')
    await pressBar('Restore')
    expect(currentNotification()?.message).toBe('Restored 2 Pages')
    await undo()
    expect(channels.mutated.mock.calls).toEqual([
      [undoOf(channels.listed[0].bundlePath, 'Notes/Alpha.md')],
      [undoOf(channels.listed[1].bundlePath, 'Notes/Ideas/Beta.md')],
    ])
  })

  it('the bar’s Delete of two asks once and posts Deleted 2 Pages with one Undo returning both to the Archive', async () => {
    channels.listed = [archived('A'), archived('B')]
    const asked = vi.fn(async () => true)
    useSession.setState({ askConfirm: asked })
    channels.mutated.mockImplementation(async (req: { path?: string }) => ({
      ok: true,
      value: req.path
        ? {
            undo: {
              op: 'restore',
              bundlePath: `.trash/${req.path.split('/').at(-1)}.deleted`,
              destination: { kind: 'archive', at: req.path },
            },
          }
        : {},
    }))
    await render()
    await check('A', 'B')
    await pressBar('Delete')
    expect(asked).toHaveBeenCalledOnce()
    expect(channels.mutated.mock.calls).toEqual(
      channels.listed.map((r) => [{ op: 'delete', path: r.bundlePath, kind: 'page' }]),
    )
    expect(currentNotification()?.message).toBe('Deleted 2 Pages')
    await undo()
    expect(channels.mutated.mock.calls).toEqual(
      channels.listed.map((r) => [
        {
          op: 'restore',
          bundlePath: `.trash/${r.bundlePath.split('/').at(-1)}.deleted`,
          destination: { kind: 'archive', at: r.bundlePath },
        },
      ]),
    )
  })

  it('a listing answered after a later one leaves the later one shown', async () => {
    let answerFirst: (value: unknown) => void = () => {}
    channels.list.mockImplementationOnce(() => new Promise((answer) => (answerFirst = answer)))
    await render()
    channels.listed = [archived('B')]
    await act(async () => storesChanged.emit())
    expect(titles()).toEqual(['B'])
    await act(async () => answerFirst({ ok: true, value: [archived('A')] }))
    expect(titles()).toEqual(['B'])
  })

  it('a search that hides the checked row withdraws the bar', async () => {
    channels.listed = [archived('A'), archived('B')]
    await render()
    await check('A')
    await act(async () =>
      useSession.setState({ viewSearch: { t1: { key: 'archive:c1', query: 'B', summon: 0 } } }),
    )
    expect(titles()).toEqual(['B'])
    expect(host.querySelector('[role=status]')?.hasAttribute('inert')).toBe(true)
  })

  it('a bar press landing after a re-list dropped its checked rows does nothing', async () => {
    await render()
    await check('A')
    const restore = barButton('Restore')
    const remove = barButton('Delete')
    channels.listed = []
    await act(async () => storesChanged.emit())
    await act(async () => {
      restore.click()
      remove.click()
    })
    expect(channels.mutated).not.toHaveBeenCalled()
    expect(currentNotification()).toBeNull()
  })

  it('a remount returns a long archive to where it was scrolled once its listing lands', async () => {
    // jsdom lays nothing out, so the scroll box clamps to the height its rows declare, as a browser's does.
    const real = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')!
    const held = new WeakMap<Element, number>()
    Object.defineProperty(Element.prototype, 'scrollTop', {
      configurable: true,
      get(this: Element) {
        return held.get(this) ?? 0
      },
      set(this: Element, top: number) {
        const rows = this.querySelector<HTMLElement>('.bundle-rows')
        held.set(this, Math.min(top, Number.parseFloat(rows?.style.height ?? '') || 0))
      },
    })
    try {
      channels.listed = Array.from({ length: 40 }, (_, i) => archived(`P${i}`))
      captureWarm('t1', 'archive:c1', { scrollTop: 900 })
      let answer: (r: unknown) => void = () => {}
      channels.list.mockImplementationOnce(() => new Promise((r) => (answer = r)))
      await render()
      await act(async () => answer({ ok: true, value: channels.listed }))
      expect(host.querySelector('.detail-scroll')?.scrollTop).toBe(900)
    } finally {
      Object.defineProperty(Element.prototype, 'scrollTop', real)
      clearWarm()
    }
  })

  it('two presses of the bar’s Restore or Delete in one tick act once', async () => {
    channels.listed = [archived('A')]
    await render()
    await check('A')
    const twice = async (label: 'Restore' | 'Delete'): Promise<void> => {
      const button = barButton(label)
      await act(async () => {
        button.click()
        button.click()
      })
    }
    await twice('Restore')
    expect(channels.mutated).toHaveBeenCalledOnce()
    act(() => clearNotification())
    channels.mutated.mockClear()
    await twice('Delete')
    expect(channels.mutated).toHaveBeenCalledOnce()
  })

  it('a batch restore closes an open reader of one of its pages', async () => {
    channels.listed = [archived('A'), archived('B')]
    channels.mutated.mockImplementation(async () => {
      readable = false
      return { ok: true, value: {} }
    })
    await render()
    await check('A', 'B')
    await doubleClick('A')
    expect(host.querySelector('[aria-label="Archived Page"]')).not.toBeNull()
    await pressBar('Restore')
    expect(useSession.getState().reader).toBeNull()
  })

  it('a batch restore closes an open reader of an inner page', async () => {
    channels.listed = [archivedSet()]
    channels.children = { [SET_BUNDLE]: [inner('P')] }
    channels.mutated.mockImplementation(async () => {
      readable = false
      return { ok: true, value: {} }
    })
    await render()
    await press(host, 'Ideas', 1)
    await doubleClick('P')
    expect(host.querySelector('[aria-label="Archived Page"]')).not.toBeNull()
    await pressBar('Restore')
    expect(channels.mutated.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: inner('P').bundlePath }],
    ])
    expect(useSession.getState().reader).toBeNull()
  })
})
