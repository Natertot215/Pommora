// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { BundleRow } from '../Bundles/rows'
import { TrashFrame } from './TrashFrame'
import { bundleRow as row, boxOf, press, rowOf, stubBrowserEachTest } from '../Testing/bundles'
import { stubDialer } from '../vitest.setup'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { personalizationOf } from '../Session/configSlice'
import { runBundled } from '../Interface/Confirm/confirmations'
import { clearNotification, currentNotification } from '../Interface/Notifications/notifications'
import { ActionLabel } from '../Interface/Notifications/ActionLabel'
import { pushUndo, resetUndo, undoValue } from '../Session/undo'
import { pageIO, scheduleBodySave } from '../Session/saveScheduler'
import { storesChanged } from '../Session/nexusSlice'
import { fault } from '../Contract/result'

vi.mock('@pommora/uix/Interactions/virtualRows', () => import('../Testing/virtualRows'))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
  let host: HTMLDivElement
  let root: Root
  const channels = stubBrowserEachTest(() => ({
    'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
  }))

  const titles = (): string[] =>
    [...host.querySelectorAll('[role="checkbox"]')].map((n) =>
      (n.getAttribute('aria-label') ?? '').replace('Select ', ''),
    )
  const showTree = async (): Promise<void> => {
    channels.listed = [trashedCollection()]
    channels.children = { [COLLECTION]: [innerSet()], [SET]: [innerPage()] }
    await act(async () => storesChanged.emit())
  }
  const armed = (bundlePath: string): Promise<void> =>
    act(async () => {
      channels.mutated.mockResolvedValueOnce({
        ok: true,
        value: { undo: { op: 'restore', bundlePath } },
      })
      const req = { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' } as const
      await runBundled('Deleted', [{ title: 'Alpha', kind: 'page', req }])
    })
  const nexus = (id: string): void => {
    const tree = makeTree()
    useSession.setState({ tree: { ...tree, nexus: { ...tree.nexus, id } } })
  }

  beforeEach(async () => {
    channels.listed = [row({ title: 'Alpha' })]
    nexus('A')
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root.render(<TrashFrame />))
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    useSession.setState({ tree: null })
  })

  it('an empty, unreadable, or unmatched Trash reads its line in the frame, after the table', async () => {
    const line = (): string | null => {
      const el = host.querySelector('.trash-empty')
      if (el?.parentElement?.classList.contains('trash-frame') !== true) return null
      return el.previousElementSibling?.classList.contains('trash-table') ? el.textContent : null
    }
    channels.listed = []
    await act(async () => storesChanged.emit())
    expect(line()).toBe('Trash is empty.')
    channels.list.mockResolvedValueOnce({ ok: false, error: { code: 'io', message: 'No.' } })
    await act(async () => storesChanged.emit())
    expect(line()).toBe("The trash couldn't be read.")
    channels.listed = [row({ title: 'Alpha' })]
    await act(async () => storesChanged.emit())
    const search = host.querySelector('input') as HTMLInputElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(search, 'zzz')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(line()).toBe('Nothing matches.')
  })

  it("lists the opened Nexus's trash after a switch", async () => {
    expect(titles()).toEqual(['Alpha'])
    expect(channels.list).toHaveBeenCalledWith({ kind: 'trash' }, undefined)
    channels.listed = [row({ title: 'Beta' })]
    await act(async () => nexus('B'))
    expect(titles()).toEqual(['Beta'])
  })

  const pickFromDateMenu = async (action: string): Promise<unknown> => {
    channels.picked = action
    const head = host.querySelector('.trash-head-date') as HTMLElement
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
    const { bundlePath } = channels.listed[0]
    await armed(bundlePath)
    useSession.setState({ askConfirm: async () => true })
    channels.mutated.mockClear()
    channels.picked = action
    const item = host.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(channels.mutated.mock.calls).toEqual([[{ op, bundlePath }]])
    expect(undoValue(null)).toBe(true)
    expect(older).toHaveBeenCalledTimes(1)
  })

  it('a restore here that is refused leaves the bundle’s Undo on the chord', async () => {
    resetUndo()
    const { bundlePath } = channels.listed[0]
    await armed(bundlePath)
    channels.mutated.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
    channels.picked = 'restore'
    const item = host.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    channels.mutated.mockClear()
    expect(undoValue(null)).toBe(true)
    await act(async () => {})
    expect(channels.mutated).toHaveBeenCalledWith({ op: 'restore', bundlePath })
  })

  it('a lone restore’s refusal is the host’s message, with no count', async () => {
    channels.mutated.mockResolvedValue(fault('That item is no longer there.'))
    channels.picked = 'restore'
    const item = host.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(currentNotification()?.message).toBe('That item is no longer there.')
  })

  it('a Restore All here spends each bundle’s Undo', async () => {
    channels.listed = [row({ title: 'Alpha' }), row({ title: 'Beta' })]
    await act(async () => nexus('B'))
    resetUndo()
    const older = vi.fn(() => true)
    pushUndo(older)
    await armed(channels.listed[0].bundlePath)
    channels.mutated.mockClear()
    for (const box of host.querySelectorAll('[role="checkbox"]'))
      await act(async () => (box as HTMLButtonElement).click())
    channels.picked = 'restore'
    const item = host.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(channels.mutated).toHaveBeenCalledTimes(2)
    expect(undoValue(null)).toBe(true)
    expect(older).toHaveBeenCalledTimes(1)
  })

  const pickForBoth = async (
    action: string,
    both = [row({ title: 'Alpha' }), row({ title: 'Beta' })],
  ): Promise<void> => {
    channels.listed = both
    await act(async () => nexus('B'))
    for (const box of host.querySelectorAll('[role="checkbox"]'))
      await act(async () => (box as HTMLButtonElement).click())
    channels.picked = action
    const item = host.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
  }

  it('a Restore All lands every pending save before its first restore', async () => {
    const order: string[] = []
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': vi.fn(async () => ({ ok: true, value: channels.listed })),
      menu: vi.fn(async () => ({ ok: true, value: channels.picked })),
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
    channels.mutated.mockResolvedValue({
      ok: true,
      value: { cascade: { pages: [], hosts: [], warning } },
    })
    await pickForBoth('restore')
    expect(currentNotification()).toMatchObject({
      message: `Restored 2 Pages. ${warning}`,
      tone: 'error',
    })
  })

  it('carries what a Delete All couldn’t strip into its notice', async () => {
    useSession.setState({ askConfirm: async () => true })
    const warning = 'Couldn’t update links in 1 Item.'
    channels.mutated.mockResolvedValue({
      ok: true,
      value: { cascade: { pages: [], hosts: [], warning } },
    })
    await pickForBoth('delete')
    expect(currentNotification()).toMatchObject({
      message: `Deleted 2 Pages. ${warning}`,
      tone: 'error',
    })
  })

  it('counts the rows a Delete All couldn’t empty in its notice', async () => {
    useSession.setState({ askConfirm: async () => true })
    channels.mutated
      .mockResolvedValueOnce({ ok: true, value: {} })
      .mockResolvedValueOnce({ ok: false, error: { code: 'io', message: 'No.' } })
    await pickForBoth('delete')
    expect(currentNotification()).toMatchObject({
      message: 'Deleted 1 Page. 1 Page couldn’t be deleted.',
      tone: 'error',
    })
  })

  it('names the title a restore here stepped to', async () => {
    channels.mutated.mockResolvedValue({ ok: true, value: { landedAs: 'Alpha (2)' } })
    channels.picked = 'restore'
    const item = host.querySelector('.data-row') as HTMLElement
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
    channels.picked = action
    const item = host.querySelector('.data-row') as HTMLElement
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
    channels.mutated.mockClear()
    await act(async () => currentNotification()?.action?.run())
    expect(channels.mutated).toHaveBeenCalledWith({ op: 'finishOwed' })
  }

  it('a restore that stepped aside and owes work keeps Try Again on its notice', async () => {
    channels.mutated.mockResolvedValue({
      ok: true,
      value: { ...OWED.value, landedAs: 'Alpha (2)' },
    })
    channels.picked = 'restore'
    const item = host.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    await triesAgain()
  })

  it('a batch restore with one owed reply offers Try Again on its notice', async () => {
    channels.mutated.mockResolvedValueOnce({ ok: true, value: {} }).mockResolvedValueOnce(OWED)
    await pickForBoth('restore')
    await triesAgain()
  })

  it('a batch empty with one owed reply offers Try Again', async () => {
    useSession.setState({ askConfirm: async () => true })
    channels.mutated.mockResolvedValueOnce({ ok: true, value: {} }).mockResolvedValueOnce(OWED)
    await pickForBoth('delete')
    await triesAgain()
  })

  it('a Restore All with one renamed names it in the segment', async () => {
    channels.mutated.mockResolvedValueOnce({ ok: true, value: { landedAs: 'Alpha (2)' } })
    await pickForBoth('restore')
    expect(currentNotification()).toMatchObject({
      message: 'Restored 2 Pages',
      segment: '“Alpha” as “Alpha (2)”',
    })
  })

  it('a Restore All with several renamed counts them', async () => {
    channels.mutated
      .mockResolvedValueOnce({ ok: true, value: { landedAs: 'Alpha (2)' } })
      .mockResolvedValueOnce({ ok: true, value: { landedAs: 'Beta (2)' } })
    await pickForBoth('restore')
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
    await pickForBoth('restore')
    unsubscribe()
    expect(channels.mutated).toHaveBeenCalledTimes(1)
    expect(currentNotification()).toBeNull()
    expect(heard).toHaveBeenCalledTimes(1)
    channels.mutated.mockClear()
    channels.mutated.mockImplementation(async () => {
      if (channels.mutated.mock.calls.length === 2) nexus('D')
      return { ok: true, value: {} }
    })
    const rows = channels.listed.map(({ title, kind, bundlePath }) => ({
      title,
      kind,
      req: { op: 'restore', bundlePath } as const,
    }))
    await act(async () => {
      await runBundled('Restored', rows)
    })
    expect(channels.mutated).toHaveBeenCalledTimes(2)
    expect(currentNotification()).toBeNull()
  })

  it('an inner row’s right-click Restore lists destinations, and its Delete empties only that item', async () => {
    await showTree()
    channels.children[SET] = [innerPage({ homeResolves: false })]
    await press(host, 'Notes', 1)
    await press(host, 'Ideas', 1)
    channels.picked = 'restoreTo:c1'
    await act(async () => {
      rowOf(host, 'P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(JSON.stringify(channels.menu.mock.lastCall)).toContain('restoreTo:c1')
    expect(channels.mutated.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: PAGE, destination: { kind: 'container', id: 'c1' } }],
    ])
    channels.mutated.mockClear()
    useSession.setState({ askConfirm: async () => true })
    channels.picked = 'delete'
    await act(async () => {
      rowOf(host, 'P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(channels.mutated.mock.calls).toEqual([[{ op: 'emptyBundle', bundlePath: PAGE }]])
  })

  const labelled = async (): Promise<void> => {
    clearNotification()
    await act(async () =>
      root.render(
        <>
          <TrashFrame />
          <ActionLabel />
        </>,
      ),
    )
  }
  const label = (): Element | null | undefined => host.querySelector('[role=status]')

  it('checking a row declares Restore and Delete', async () => {
    await labelled()
    await act(async () => boxOf(host, 'Alpha').click())
    const face = label()?.querySelector('[data-face="shown"]')
    expect(face?.textContent).toBe('Restore1 Page')
    const restore = [...(face?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === 'Restore',
    )
    await act(async () => (restore as HTMLElement).click())
    expect(channels.mutated.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: channels.listed[0].bundlePath }],
    ])
  })

  it('unchecking withdraws the bar', async () => {
    await labelled()
    await act(async () => boxOf(host, 'Alpha').click())
    expect(label()?.hasAttribute('inert')).toBe(false)
    await act(async () => boxOf(host, 'Alpha').click())
    expect(label()?.hasAttribute('inert')).toBe(true)
  })

  it('lists a delete made elsewhere while it is open', async () => {
    channels.listed = [row({ title: 'Alpha' }), row({ title: 'Gamma' })]
    await act(async () => {
      await useSession.getState().mutate({ op: 'delete', path: 'Notes', kind: 'collection' })
    })
    expect(titles()).toEqual(['Alpha', 'Gamma'])
  })
})
