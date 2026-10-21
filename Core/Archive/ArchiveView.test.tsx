// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { BundleRow } from '../Bundles/rows'
import { ArchiveView } from './ArchiveView'
import { bundleRow } from '../Testing/fixtures'
import { stubDialer } from '../vitest.setup'
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

vi.mock('@pommora/uix/Interactions/virtualRows', () => ({
  useVirtualRows: ({ count, rowHeight }: { count: number; rowHeight: number }) => ({
    height: count * rowHeight,
    rows: Array.from({ length: count }, (_, index) => ({
      key: index,
      index,
      start: index * rowHeight,
    })),
  }),
}))
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

describe('ArchiveView', () => {
  let host: HTMLDivElement
  let root: Root
  let listed: BundleRow[]
  let list: ReturnType<typeof vi.fn>
  let mutated: ReturnType<typeof vi.fn>
  let picked: string | null
  let readable: boolean
  const tree = makeTree()
  const collection = tree.collections[0] as CollectionNode
  const set = collection.sets[0] as SetNode

  const render = async (owner: CollectionNode | SetNode = collection, parked = false) =>
    act(async () =>
      root.render(
        <>
          <ContentHostContext.Provider value={{ tabId: 't1', key: `archive:${owner.id}`, parked }}>
            <ArchiveView owner={owner} />
          </ContentHostContext.Provider>
          <ActionLabel />
          <PageReaderWindow />
        </>,
      ),
    )
  const rowEls = (): HTMLElement[] => [
    ...host.querySelectorAll<HTMLElement>('.archive-rows .data-row'),
  ]
  const titles = (): string[] =>
    rowEls().map((r) => r.querySelector('.cell-title-text')?.textContent ?? '')
  const rowOf = (title: string): HTMLElement =>
    rowEls().find((r) => r.querySelector('.cell-title-text')?.textContent === title) as HTMLElement
  const boxOf = (title: string): Element | null => rowOf(title).querySelector('[role="checkbox"]')
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
    for (const title of rows) await act(async () => rowOf(title).click())
  }
  const undo = async (): Promise<void> => {
    mutated.mockClear()
    await act(async () => {
      currentNotification()?.action?.run()
      await new Promise((settle) => setTimeout(settle, 0))
    })
  }

  beforeEach(async () => {
    listed = [archived('A', { stored: { id: 'p1', path: 'x/A.md' } })]
    picked = null
    readable = true
    mutated = vi.fn(async () => ({ ok: true, value: {} }))
    list = vi.fn(async () => ({ ok: true, value: listed }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': list,
      menu: vi.fn(async () => ({ ok: true, value: picked })),
      mutate: mutated,
      'delete:facts': vi.fn(async () => ({
        ok: true,
        value: { trashMode: 'nexus', permanentDelete: false },
      })),
      'page:open': vi.fn(async () =>
        readable
          ? { ok: true, value: { body: 'Root body.' } }
          : { ok: false, error: { code: 'not-found', message: 'gone' } },
      ),
    })
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
    listed = [
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
    expect(list).toHaveBeenCalledWith({ kind: 'archive', id: 'c1' }, undefined)
    expect(titles()).toEqual(['Newer', 'Older'])
    const cell = rowOf('Newer').querySelector('.cell-lead')
    expect(cell?.lastElementChild?.textContent).toBe('Notes›Ideas')
    const dates = rowEls().map((r) => r.querySelector('.data-cell.archive-date')?.textContent ?? '')
    expect(dates.every((d) => d !== '')).toBe(true)
    expect(dates[0]).not.toBe(dates[1])
  })

  it('its Title and Archived headings each wear their type’s glyph, as a table’s headings do', async () => {
    await render()
    const heads = [...host.querySelectorAll('.table-head .col-header')]
    expect(heads.map((h) => h.querySelectorAll('.col-header-icon svg').length)).toEqual([1, 1])
  })

  it('a click on a row checks it, and a page row’s title opens the reader titled by its trail under the stroked lock', async () => {
    await render()
    await check('A')
    expect(boxOf('A')?.getAttribute('aria-checked')).toBe('true')
    const title = rowOf('A').querySelector('.cell-title') as HTMLElement
    await act(async () => title.click())
    expect(boxOf('A')?.getAttribute('aria-checked')).toBe('true')
    expect(useSession.getState().reader).toEqual({
      kind: 'archive',
      page: { kind: 'page', id: 'p1', path: 'x/A.md' },
      trail: [expect.objectContaining({ title: 'Notes' }), expect.objectContaining({ title: 'A' })],
    })
    expect(host.querySelector('.reader-lock svg')?.classList.contains('lucide-lock')).toBe(true)
  })

  it('a Set row’s title opens nothing and checks its row', async () => {
    listed = [archived('Ideas', { kind: 'set' })]
    await render()
    const title = rowOf('Ideas').querySelector('.cell-title') as HTMLElement
    await act(async () => title.click())
    expect(useSession.getState().reader).toBeNull()
    expect(boxOf('Ideas')?.getAttribute('aria-checked')).toBe('true')
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

  it('an empty archive reads its one line', async () => {
    listed = []
    await render()
    expect(empty()).toBe("This Collection's archive is empty.")
  })

  it('a top-level Set’s empty archive reads the Set’s line', async () => {
    listed = []
    await render(set)
    expect(list).toHaveBeenCalledWith({ kind: 'archive', id: 'c1' }, 's1')
    expect(empty()).toBe("This Set's archive is empty.")
  })

  it('a listing that fails reads its one line and draws no rows', async () => {
    await render()
    expect(titles()).toEqual(['A'])
    list.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
    await act(async () => storesChanged.emit())
    expect(titles()).toEqual([])
    expect(empty()).toBe("The archive couldn't be read.")
  })

  it('narrows in place by the tab’s search, keeping archived order', async () => {
    listed = [archived('Beta Two'), archived('Alpha'), archived('Beta One')]
    await render()
    await act(async () =>
      useSession.setState({ viewSearch: { t1: { key: 'archive:c1', query: 'beta', summon: 0 } } }),
    )
    expect(titles()).toEqual(['Beta Two', 'Beta One'])
  })

  it('declares its bar while rows are checked, reading their count, and withdraws it when parked', async () => {
    listed = [archived('A'), archived('B')]
    await render()
    expect(host.querySelector('[role=status]')?.hasAttribute('inert')).toBe(true)
    await check('A', 'B')
    expect(face()?.textContent).toBe('Restore2 Pages')
    await render(collection, true)
    expect(host.querySelector('[role=status]')?.hasAttribute('inert')).toBe(true)
  })

  it('a right-click Delete moves the row into the Trash with an Undo that returns it to the Archive', async () => {
    const { bundlePath } = listed[0]
    const trashed = '.trash/Notes/2026-10-21T12-00-00-000Z__A.md.deleted'
    mutated.mockResolvedValue({ ok: true, value: { bundled: { bundlePath: trashed } } })
    await render()
    picked = 'delete'
    await act(async () => {
      rowOf('A').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(mutated.mock.calls).toEqual([[{ op: 'delete', path: bundlePath, kind: 'page' }]])
    expect(currentNotification()?.message).toBe('Deleted “A”')
    await undo()
    expect(mutated.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: trashed, destination: { kind: 'archive' } }],
    ])
  })

  it('the bar’s Restore of one row posts Restored “A”, and of two Restored 2 Pages, whose Undo archives each item again where the tree now holds it, under the bundle name it left', async () => {
    listed = [
      archived('A', { stored: { id: 'p1', path: 'x/A.md' } }),
      archived('B', { stored: { id: 'p2', path: 'x/B.md' } }),
    ]
    await render()
    await check('A')
    await pressBar('Restore')
    expect(mutated.mock.calls).toEqual([[{ op: 'restore', bundlePath: listed[0].bundlePath }]])
    expect(currentNotification()?.message).toBe('Restored “A”')
    act(() => clearNotification())
    await check('B')
    await pressBar('Restore')
    expect(currentNotification()?.message).toBe('Restored 2 Pages')
    await undo()
    expect(mutated.mock.calls).toEqual([
      [
        {
          op: 'archive',
          path: 'Notes/Alpha.md',
          kind: 'page',
          leaf: '2026-10-20T12-00-00-000Z__A.md.archived',
        },
      ],
      [
        {
          op: 'archive',
          path: 'Notes/Ideas/Beta.md',
          kind: 'page',
          leaf: '2026-10-20T12-00-00-000Z__B.md.archived',
        },
      ],
    ])
  })

  it('the bar’s Delete of two asks once and posts Deleted 2 Pages with one Undo returning both to the Archive', async () => {
    listed = [archived('A'), archived('B')]
    const asked = vi.fn(async () => true)
    useSession.setState({ askConfirm: asked })
    mutated.mockImplementation(async (req: { path?: string }) => ({
      ok: true,
      value: req.path
        ? { bundled: { bundlePath: `.trash/${req.path.split('/').at(-1)}.deleted` } }
        : {},
    }))
    await render()
    await check('A', 'B')
    await pressBar('Delete')
    expect(asked).toHaveBeenCalledOnce()
    expect(mutated.mock.calls).toEqual(
      listed.map((r) => [{ op: 'delete', path: r.bundlePath, kind: 'page' }]),
    )
    expect(currentNotification()?.message).toBe('Deleted 2 Pages')
    await undo()
    expect(mutated.mock.calls).toEqual(
      listed.map((r) => [
        {
          op: 'restore',
          bundlePath: `.trash/${r.bundlePath.split('/').at(-1)}.deleted`,
          destination: { kind: 'archive' },
        },
      ]),
    )
  })

  it('a listing answered after a later one leaves the later one shown', async () => {
    let answerFirst: (value: unknown) => void = () => {}
    list.mockImplementationOnce(() => new Promise((answer) => (answerFirst = answer)))
    await render()
    listed = [archived('B')]
    await act(async () => storesChanged.emit())
    expect(titles()).toEqual(['B'])
    await act(async () => answerFirst({ ok: true, value: [archived('A')] }))
    expect(titles()).toEqual(['B'])
  })

  it('a batch whose last ask lands after a Nexus switch posts nothing', async () => {
    listed = [archived('A'), archived('B')]
    await render()
    await check('A', 'B')
    mutated.mockImplementation(async () => {
      if (mutated.mock.calls.length === 2)
        useSession.setState({ tree: { ...tree, nexus: { ...tree.nexus, id: 'elsewhere' } } })
      return { ok: true, value: {} }
    })
    await pressBar('Delete')
    expect(mutated).toHaveBeenCalledTimes(2)
    expect(currentNotification()).toBeNull()
  })

  it('the bar’s Restore of a row whose place is gone asks where and restores there, and a batch restores the rest and says what had nowhere to go', async () => {
    listed = [archived('Gone', { homeResolves: false }), archived('Kept')]
    picked = collection.id
    await render()
    await check('Gone')
    await pressBar('Restore')
    expect(mutated.mock.calls).toEqual([
      [
        {
          op: 'restore',
          bundlePath: listed[0].bundlePath,
          destination: { kind: 'container', id: collection.id },
        },
      ],
    ])
    expect(currentNotification()?.message).toBe('Restored “Gone”')
    act(() => clearNotification())
    await check('Kept')
    mutated.mockClear()
    await pressBar('Restore')
    expect(mutated.mock.calls).toEqual([[{ op: 'restore', bundlePath: listed[1].bundlePath }]])
    expect(currentNotification()).toMatchObject({
      message:
        'Restored 1 Page. 1 Page had nowhere to go — restore those one at a time to choose where.',
      tone: 'error',
    })
  })

  it('a search that hides the checked row withdraws the bar and shows no box', async () => {
    listed = [archived('A'), archived('B')]
    await render()
    await check('A')
    await act(async () =>
      useSession.setState({ viewSearch: { t1: { key: 'archive:c1', query: 'B', summon: 0 } } }),
    )
    expect(titles()).toEqual(['B'])
    expect(host.querySelector('[data-reveal-host="on"]')).toBeNull()
    expect(host.querySelector('[role=status]')?.hasAttribute('inert')).toBe(true)
  })

  it('a bar press landing after a re-list dropped its checked rows does nothing', async () => {
    await render()
    await check('A')
    const restore = barButton('Restore')
    const remove = barButton('Delete')
    listed = []
    await act(async () => storesChanged.emit())
    await act(async () => {
      restore.click()
      remove.click()
    })
    expect(mutated).not.toHaveBeenCalled()
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
        const rows = this.querySelector<HTMLElement>('.archive-rows')
        held.set(this, Math.min(top, Number.parseFloat(rows?.style.height ?? '') || 0))
      },
    })
    try {
      listed = Array.from({ length: 40 }, (_, i) => archived(`P${i}`))
      captureWarm('t1', 'archive:c1', { scrollTop: 900 })
      let answer: (r: unknown) => void = () => {}
      list.mockImplementationOnce(() => new Promise((r) => (answer = r)))
      await render()
      await act(async () => answer({ ok: true, value: listed }))
      expect(host.querySelector('.detail-scroll')?.scrollTop).toBe(900)
    } finally {
      Object.defineProperty(Element.prototype, 'scrollTop', real)
      clearWarm()
    }
  })

  it('two presses of the bar’s Restore or Delete in one tick act once', async () => {
    listed = [archived('A')]
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
    expect(mutated).toHaveBeenCalledOnce()
    act(() => clearNotification())
    mutated.mockClear()
    await twice('Delete')
    expect(mutated).toHaveBeenCalledOnce()
  })

  it('a batch restore closes an open reader of one of its pages', async () => {
    listed = [archived('A'), archived('B')]
    mutated.mockImplementation(async () => {
      readable = false
      return { ok: true, value: {} }
    })
    await render()
    await check('A', 'B')
    await act(async () => (rowOf('A').querySelector('.cell-title') as HTMLElement).click())
    expect(host.querySelector('[aria-label="Archived Page"]')).not.toBeNull()
    await pressBar('Restore')
    expect(useSession.getState().reader).toBeNull()
  })
})
