// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { BundleRow } from '../Bundles/rows'
import { TrashFrame } from './TrashFrame'
import { bundleRow as row } from '../Testing/fixtures'
import { stubDialer } from '../vitest.setup'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { personalizationOf } from '../Session/configSlice'
import { offerUndo } from '../Interface/Confirm/confirmations'
import {
  clearNotification,
  currentNotification,
  notifyDeleted,
} from '../Interface/Notifications/notifications'
import { pushUndo, resetUndo, undoValue } from '../Session/undo'
import { pageIO, scheduleBodySave } from '../Session/saveScheduler'
import { storesChanged } from '../Session/nexusSlice'
import { dropOutlineOpen } from '@pommora/uix/Menus/listed-outline.css'
import { rowIndent } from '@pommora/uix/Table/rowIndent'

vi.mock('@pommora/uix/Interactions/virtualRows', () => import('../Testing/virtualRows'))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('a Trash row', () => {
  let host: HTMLDivElement | null = null
  let root: Root | null = null

  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': vi.fn(async () => ({ ok: true, value: [row({ title: 'Alpha' })] })),
    })
  })
  afterEach(async () => {
    await act(async () => root?.unmount())
    host?.remove()
    root = null
    host = null
  })

  it('checks itself through the checkbox in its gutter', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root?.render(<TrashFrame />))
    const box = host.querySelector('[role="checkbox"]') as HTMLButtonElement
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(host.querySelector('[data-reveal-host="on"]')).toBeNull()
    await act(async () => box.click())
    expect(box.getAttribute('aria-checked')).toBe('true')
    expect(host.querySelector('[data-reveal-host="on"]')).not.toBeNull()
  })

  it('a search that hides the checked row shows no box', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': vi.fn(async () => ({
        ok: true,
        value: [row({ title: 'Alpha' }), row({ title: 'Beta' })],
      })),
    })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root?.render(<TrashFrame />))
    const box = host.querySelector('[role="checkbox"]') as HTMLButtonElement
    await act(async () => box.click())
    const search = host.querySelector('input') as HTMLInputElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        search,
        'Beta',
      )
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(host.querySelectorAll('.data-row')).toHaveLength(1)
    expect(host.querySelector('[data-reveal-host="on"]')).toBeNull()
  })
})

const COLLECTION = '.trash/2026-10-20T12-00-00-000Z__Notes.deleted'
const SET = `${COLLECTION}/Notes/Ideas`
const PAGE = `${SET}/P.md`

const trashedCollection = (): BundleRow =>
  row({ title: 'Notes', kind: 'collection', bundlePath: COLLECTION, crumbs: [] })
const innerSet = (): BundleRow =>
  row({
    title: 'Ideas',
    kind: 'set',
    bundlePath: SET,
    crumbs: [{ kind: 'collection', title: 'Notes' }],
  })
const innerPage = (over: Partial<BundleRow> = {}): BundleRow =>
  row({
    title: 'P',
    bundlePath: PAGE,
    crumbs: [
      { kind: 'collection', title: 'Notes' },
      { kind: 'set', title: 'Ideas' },
    ],
    ...over,
  })

describe('the Trash pane', () => {
  let host: HTMLDivElement | null = null
  let root: Root | null = null
  let listed: BundleRow[]
  let list: ReturnType<typeof vi.fn>
  let picked: string | null
  let menu: ReturnType<typeof vi.fn>
  let mutated: ReturnType<typeof vi.fn>
  let children: Record<string, BundleRow[]>

  const titles = (): string[] =>
    [...(host?.querySelectorAll('[role="checkbox"]') ?? [])].map((n) =>
      (n.getAttribute('aria-label') ?? '').replace('Select ', ''),
    )
  const rowOf = (title: string): HTMLElement =>
    host?.querySelector(`[aria-label="Select ${title}"]`)?.closest('.data-row') as HTMLElement
  const boxOf = (title: string): HTMLElement =>
    host?.querySelector(`[aria-label="Select ${title}"]`) as HTMLElement
  const press = async (title: string, detail: number): Promise<void> =>
    act(async () => {
      rowOf(title).dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
    })
  const indentOf = (title: string): string =>
    (rowOf(title).querySelector('.bundle-title') as HTMLElement).style.marginLeft
  const showTree = async (): Promise<void> => {
    listed = [trashedCollection()]
    children = { [COLLECTION]: [innerSet()], [SET]: [innerPage()] }
    await act(async () => storesChanged.emit())
  }
  const nexus = (id: string): void => {
    const tree = makeTree()
    useSession.setState({ tree: { ...tree, nexus: { ...tree.nexus, id } } })
  }

  beforeEach(async () => {
    listed = [row({ title: 'Alpha' })]
    picked = null
    children = {}
    mutated = vi.fn(async () => ({ ok: true, value: {} }))
    list = vi.fn(async () => ({ ok: true, value: listed }))
    menu = vi.fn(async () => ({ ok: true, value: picked }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': list,
      'bundles:children': vi.fn(async (addresses: string[]) => ({
        ok: true,
        value: addresses.map((address) => children[address] ?? []),
      })),
      menu,
      'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
      mutate: mutated,
      'delete:facts': vi.fn(async () => ({
        ok: true,
        value: { permanentDelete: false },
      })),
    })
    nexus('A')
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root?.render(<TrashFrame />))
  })
  afterEach(async () => {
    await act(async () => root?.unmount())
    host?.remove()
    root = null
    host = null
    useSession.setState({ tree: null })
  })

  it('Space checks any row, and Enter discloses a container and checks a page', async () => {
    await showTree()
    const key = async (title: string, k: string): Promise<void> =>
      act(async () => {
        rowOf(title).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
      })
    await key('Notes', ' ')
    expect(boxOf('Notes').getAttribute('aria-checked')).toBe('true')
    expect(titles()).toEqual(['Notes'])
    await key('Notes', 'Enter')
    await key('Ideas', 'Enter')
    expect(titles()).toEqual(['Notes', 'Ideas', 'P'])
    expect(boxOf('Ideas').getAttribute('aria-checked')).toBe('false')
    await key('P', 'Enter')
    expect(boxOf('P').getAttribute('aria-checked')).toBe('true')
    await key('P', ' ')
    expect(boxOf('P').getAttribute('aria-checked')).toBe('false')
  })

  it('an empty, unreadable, or unmatched Trash reads its line in the frame, after the table', async () => {
    const line = (): string | null => {
      const el = host?.querySelector('.trash-empty')
      if (el?.parentElement?.classList.contains('trash-frame') !== true) return null
      return el.previousElementSibling?.classList.contains('trash-table') ? el.textContent : null
    }
    listed = []
    await act(async () => storesChanged.emit())
    expect(line()).toBe('Trash is empty.')
    list.mockResolvedValueOnce({ ok: false, error: { code: 'io', message: 'No.' } })
    await act(async () => storesChanged.emit())
    expect(line()).toBe("The trash couldn't be read.")
    listed = [row({ title: 'Alpha' })]
    await act(async () => storesChanged.emit())
    const search = host?.querySelector('input') as HTMLInputElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(search, 'zzz')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(line()).toBe('Nothing matches.')
  })

  it("lists the opened Nexus's trash after a switch", async () => {
    expect(titles()).toEqual(['Alpha'])
    expect(list).toHaveBeenCalledWith({ kind: 'trash' }, undefined)
    listed = [row({ title: 'Beta' })]
    await act(async () => nexus('B'))
    expect(titles()).toEqual(['Beta'])
  })

  const pickFromDateMenu = async (action: string): Promise<unknown> => {
    picked = action
    const head = host?.querySelector('.trash-head-date') as HTMLElement
    await act(async () => {
      head.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    return personalizationOf(useSession.getState()).trashColumnStyle
  }

  it("goes back to following the Nexus when its date menu picks the Nexus's own form", async () => {
    await act(async () =>
      useSession.setState(({ tree }) => ({
        tree: tree && {
          ...tree,
          config: {
            ...tree.config,
            personalization: { dateFormat: 'relative', trashColumnStyle: { date_format: 'full' } },
          },
        },
      })),
    )
    expect(await pickFromDateMenu('style:date_format:relative')).toBeUndefined()
  })

  it('stores a hidden time, and nothing once the time is back on the Nexus clock', async () => {
    await act(async () =>
      useSession.setState(({ tree }) => ({
        tree: tree && {
          ...tree,
          config: { ...tree.config, personalization: { timeFormat: 'twentyFourHour' } },
        },
      })),
    )
    expect(await pickFromDateMenu('style:time_format:none')).toEqual({ time_format: 'none' })
    expect(await pickFromDateMenu('style:time_format:twentyFourHour')).toBeUndefined()
    expect(await pickFromDateMenu('style:time_format:none')).toEqual({ time_format: 'none' })
    expect(await pickFromDateMenu('style:time_format:shown')).toBeUndefined()
  })

  it.each([
    ['restore', 'restore'],
    ['delete', 'emptyBundle'],
  ])('a %s here spends the bundle’s Undo, so the chord reaches the entry beneath', async (action, op) => {
    resetUndo()
    const older = vi.fn(() => true)
    pushUndo(older)
    const { bundlePath } = listed[0]
    offerUndo([bundlePath], (undo) => notifyDeleted('Alpha', undo))
    useSession.setState({ askConfirm: async () => true })
    mutated.mockClear()
    picked = action
    const item = host?.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(mutated.mock.calls).toEqual([[{ op, bundlePath }]])
    expect(undoValue(null)).toBe(true)
    expect(older).toHaveBeenCalledTimes(1)
  })

  it('a restore here that is refused leaves the bundle’s Undo on the chord', async () => {
    resetUndo()
    const { bundlePath } = listed[0]
    offerUndo([bundlePath], (undo) => notifyDeleted('Alpha', undo))
    mutated.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
    picked = 'restore'
    const item = host?.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    mutated.mockClear()
    expect(undoValue(null)).toBe(true)
    await act(async () => {})
    expect(mutated).toHaveBeenCalledWith({ op: 'restore', bundlePath })
  })

  it('a Restore All here spends each bundle’s Undo', async () => {
    listed = [row({ title: 'Alpha' }), row({ title: 'Beta' })]
    await act(async () => nexus('B'))
    resetUndo()
    const older = vi.fn(() => true)
    pushUndo(older)
    offerUndo([listed[0].bundlePath], (undo) => notifyDeleted('Alpha', undo))
    for (const box of host?.querySelectorAll('[role="checkbox"]') ?? [])
      await act(async () => (box as HTMLButtonElement).click())
    picked = 'restore'
    const item = host?.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(mutated).toHaveBeenCalledTimes(2)
    expect(undoValue(null)).toBe(true)
    expect(older).toHaveBeenCalledTimes(1)
  })

  const pickForBoth = async (
    action: string,
    both = [row({ title: 'Alpha' }), row({ title: 'Beta' })],
  ): Promise<void> => {
    listed = both
    await act(async () => nexus('B'))
    for (const box of host?.querySelectorAll('[role="checkbox"]') ?? [])
      await act(async () => (box as HTMLButtonElement).click())
    picked = action
    const item = host?.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
  }

  it('a Restore All lands every pending save before its first restore', async () => {
    const order: string[] = []
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': vi.fn(async () => ({ ok: true, value: listed })),
      menu: vi.fn(async () => ({ ok: true, value: picked })),
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
    await pickForBoth('restore')
    expect(order).toEqual(['save Notes/A.md', 'mutate', 'mutate'])
  })

  it('carries what a Restore All couldn’t re-spell into its notice', async () => {
    const warning = 'Couldn’t update links in “Alpha” across 1 Item.'
    mutated.mockResolvedValue({ ok: true, value: { cascade: { pages: [], hosts: [], warning } } })
    await pickForBoth('restore')
    expect(currentNotification()).toMatchObject({
      message: `Restored 2 Pages. ${warning}`,
      tone: 'error',
    })
  })

  it('carries what a Delete All couldn’t strip into its notice', async () => {
    useSession.setState({ askConfirm: async () => true })
    const warning = 'Couldn’t update links in 1 Item.'
    mutated.mockResolvedValue({ ok: true, value: { cascade: { pages: [], hosts: [], warning } } })
    await pickForBoth('delete')
    expect(currentNotification()).toMatchObject({
      message: `Deleted 2 Pages. ${warning}`,
      tone: 'error',
    })
  })

  it('counts the rows a Delete All couldn’t empty in its notice', async () => {
    useSession.setState({ askConfirm: async () => true })
    mutated
      .mockResolvedValueOnce({ ok: true, value: {} })
      .mockResolvedValueOnce({ ok: false, error: { code: 'io', message: 'No.' } })
    await pickForBoth('delete')
    expect(currentNotification()).toMatchObject({
      message: 'Deleted 1 Page. 1 Page couldn’t be deleted.',
      tone: 'error',
    })
  })

  it('names the title a restore here stepped to', async () => {
    mutated.mockResolvedValue({ ok: true, value: { landedAs: 'Alpha (2)' } })
    picked = 'restore'
    const item = host?.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(currentNotification()).toMatchObject({
      message: 'Restored “Alpha” as “Alpha (2)”',
      tone: 'normal',
    })
  })

  it.each([
    ['restore', 'Restored “Alpha”'],
    ['delete', 'Deleted “Alpha”'],
  ])('a single %s here posts its title', async (action, message) => {
    clearNotification()
    useSession.setState({ askConfirm: async () => true })
    picked = action
    const item = host?.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
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
    mutated.mockClear()
    await act(async () => currentNotification()?.action?.run())
    expect(mutated).toHaveBeenCalledWith({ op: 'finishOwed' })
  }

  it('a restore that stepped aside and owes work keeps Try Again on its notice', async () => {
    mutated.mockResolvedValue({
      ok: true,
      value: { ...OWED.value, landedAs: 'Alpha (2)' },
    })
    picked = 'restore'
    const item = host?.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    await triesAgain()
  })

  it('a batch restore with one owed reply offers Try Again on its notice', async () => {
    mutated.mockResolvedValueOnce({ ok: true, value: {} }).mockResolvedValueOnce(OWED)
    await pickForBoth('restore')
    await triesAgain()
  })

  it('a batch empty with one owed reply offers Try Again', async () => {
    useSession.setState({ askConfirm: async () => true })
    mutated.mockResolvedValueOnce({ ok: true, value: {} }).mockResolvedValueOnce(OWED)
    await pickForBoth('delete')
    await triesAgain()
  })

  it('a Restore All with one renamed names it in the segment', async () => {
    mutated.mockResolvedValueOnce({ ok: true, value: { landedAs: 'Alpha (2)' } })
    await pickForBoth('restore')
    expect(currentNotification()).toMatchObject({
      message: 'Restored 2 Pages',
      segment: '“Alpha” as “Alpha (2)”',
    })
  })

  it('a Restore All with several renamed counts them', async () => {
    mutated
      .mockResolvedValueOnce({ ok: true, value: { landedAs: 'Alpha (2)' } })
      .mockResolvedValueOnce({ ok: true, value: { landedAs: 'Beta (2)' } })
    await pickForBoth('restore')
    expect(currentNotification()).toMatchObject({ segment: '2 Renamed' })
  })

  it('a Restore All asks once where its homeless rows go, sending only them there, and a dismissed ask restores nothing', async () => {
    const rows = [
      row({ title: 'Alpha', homeResolves: false }),
      row({ title: 'Beta', homeResolves: false }),
      row({ title: 'Gamma' }),
    ]
    const answer = (value: string | null) => ({ ok: true, value })
    menu.mockResolvedValueOnce(answer('restore')).mockResolvedValueOnce(answer(null))
    await pickForBoth('restore', rows)
    expect(menu).toHaveBeenCalledTimes(2)
    expect(mutated).not.toHaveBeenCalled()
    menu.mockResolvedValueOnce(answer('restore')).mockResolvedValueOnce(answer('c1'))
    const item = host?.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(menu).toHaveBeenCalledTimes(4)
    const to = { kind: 'container', id: 'c1' }
    expect(mutated.mock.calls.map(([req]) => req)).toEqual([
      { op: 'restore', bundlePath: rows[0].bundlePath, destination: to },
      { op: 'restore', bundlePath: rows[1].bundlePath, destination: to },
      { op: 'restore', bundlePath: rows[2].bundlePath },
    ])
  })

  it('a Nexus switch during a batch stops it, posting no notice and telling the stores once', async () => {
    clearNotification()
    const heard = vi.fn()
    const unsubscribe = storesChanged.subscribe(heard)
    mutated.mockImplementationOnce(async () => {
      nexus('C')
      return { ok: true, value: {} }
    })
    await pickForBoth('restore')
    unsubscribe()
    expect(mutated).toHaveBeenCalledTimes(1)
    expect(currentNotification()).toBeNull()
    expect(heard).toHaveBeenCalledTimes(1)
  })

  it('a Collection row’s click discloses its Sets and then its pages, indented, and its checkbox still checks it', async () => {
    await showTree()
    const chevron = rowOf('Notes').querySelector('[data-drop-outline]')
    expect(chevron?.classList.contains(dropOutlineOpen)).toBe(false)
    await press('Notes', 1)
    expect(titles()).toEqual(['Notes', 'Ideas'])
    expect(
      rowOf('Notes').querySelector('[data-drop-outline]')?.classList.contains(dropOutlineOpen),
    ).toBe(true)
    await press('Ideas', 1)
    expect(titles()).toEqual(['Notes', 'Ideas', 'P'])
    expect([indentOf('Notes'), indentOf('Ideas'), indentOf('P')]).toEqual([
      rowIndent(0),
      rowIndent(1),
      rowIndent(2),
    ])
    expect(rowOf('P').querySelector('[data-drop-outline]')).toBeNull()
    expect(boxOf('Notes').getAttribute('aria-checked')).toBe('false')
    await act(async () => boxOf('Notes').click())
    expect(boxOf('Notes').getAttribute('aria-checked')).toBe('true')
    expect(titles()).toEqual(['Notes', 'Ideas', 'P'])
  })

  it('a page row’s double-click leaves it checked and opens nothing', async () => {
    for (const detail of [1, 2])
      await act(async () => {
        rowOf('Alpha').dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
      })
    await act(async () => {
      rowOf('Alpha').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(boxOf('Alpha').getAttribute('aria-checked')).toBe('true')
    expect(useSession.getState().reader).toBeNull()
  })

  it('an inner row’s right-click Restore lists destinations, and its Delete empties only that item', async () => {
    await showTree()
    children[SET] = [innerPage({ homeResolves: false })]
    await press('Notes', 1)
    await press('Ideas', 1)
    picked = 'restoreTo:c1'
    await act(async () => {
      rowOf('P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(JSON.stringify(menu.mock.lastCall)).toContain('restoreTo:c1')
    expect(mutated.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: PAGE, destination: { kind: 'container', id: 'c1' } }],
    ])
    mutated.mockClear()
    useSession.setState({ askConfirm: async () => true })
    picked = 'delete'
    await act(async () => {
      rowOf('P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(mutated.mock.calls).toEqual([[{ op: 'emptyBundle', bundlePath: PAGE }]])
  })

  it('a checked inner row stays checked across a refresh, and across its container collapsing and reopening', async () => {
    await showTree()
    await press('Notes', 1)
    await press('Ideas', 1)
    await press('P', 1)
    expect(boxOf('P').getAttribute('aria-checked')).toBe('true')
    await act(async () => storesChanged.emit())
    expect(boxOf('P').getAttribute('aria-checked')).toBe('true')
    await press('Ideas', 1)
    expect(titles()).toEqual(['Notes', 'Ideas'])
    await press('Ideas', 1)
    expect(boxOf('P').getAttribute('aria-checked')).toBe('true')
  })

  it('an inner row’s trail reads its bundle’s trail, then the containers inside the bundle', async () => {
    await showTree()
    await press('Notes', 1)
    await press('Ideas', 1)
    expect(rowOf('P').querySelector('.bundle-trail')?.textContent).toBe('Notes›Ideas')
  })

  it('lists a delete made elsewhere while it is open', async () => {
    listed = [row({ title: 'Alpha' }), row({ title: 'Gamma' })]
    await act(async () => {
      await useSession.getState().mutate({ op: 'delete', path: 'Notes', kind: 'collection' })
    })
    expect(titles()).toEqual(['Alpha', 'Gamma'])
  })
})
