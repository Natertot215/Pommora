// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { TrashRow } from '@pommora/core/Trash/trashRow'
import { countPhrase, filterRows, TrashFrame } from './TrashFrame'
import { stubDialer } from '../vitest.setup'
import { useSession } from '../Session/store'
import { makeTree } from '@pommora/core/Testing/testTree'
import { notifyTrashed } from '../Interface/Confirm/confirmations'
import { currentNotification } from '../Interface/Notifications/notifications'
import { pushUndo, resetUndo, undoValue } from '../Session/undo'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const row = (over: Partial<TrashRow>): TrashRow => ({
  bundlePath: `.trash/${over.title ?? 'x'}.deleted`,
  kind: 'page',
  title: 'Alpha',
  crumbs: [{ kind: 'collection', title: 'Notes' }],
  deletedAt: 0,
  homeResolves: true,
  ...over,
})

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

  it('a query nothing answers yields nothing', () => {
    expect(filterRows(rows, 'zzz')).toEqual([])
  })

  it('a row with no location is still matched on its title alone', () => {
    expect(filterRows(rows, 'gamma').map((r) => r.title)).toEqual(['Gamma'])
  })
})

describe('countPhrase', () => {
  it('names the kind when every row shares one', () => {
    expect(countPhrase([row({}), row({})])).toBe('2 pages')
    expect(countPhrase([row({ kind: 'set' }), row({ kind: 'set' })])).toBe('2 sets')
    expect(countPhrase([row({ kind: 'context' }), row({ kind: 'context' })])).toBe('2 contexts')
  })

  it('generalizes when they do not', () => {
    expect(countPhrase([row({}), row({ kind: 'space' })])).toBe('2 items')
  })

  it('stays singular for one', () => {
    expect(countPhrase([row({})])).toBe('1 page')
    expect(countPhrase([row({ kind: 'space' })])).toBe('1 space')
  })

  it('reports none honestly', () => {
    expect(countPhrase([])).toBe('0 items')
  })
})

describe('a Trash row', () => {
  let host: HTMLDivElement | null = null
  let root: Root | null = null

  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'trash:list': vi.fn(async () => ({ ok: true, value: [row({ title: 'Alpha' })] })),
    })
  })
  afterEach(async () => {
    await act(async () => root?.unmount())
    host?.remove()
    root = null
    host = null
  })

  it('checks itself through the checkbox in its lead inset', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root?.render(<TrashFrame />))
    const box = host.querySelector('[role="checkbox"]') as HTMLButtonElement
    expect(box.getAttribute('aria-checked')).toBe('false')
    expect(host.querySelector('.has-checked')).toBeNull()
    await act(async () => box.click())
    expect(box.getAttribute('aria-checked')).toBe('true')
    expect(host.querySelector('.has-checked')).not.toBeNull()
  })
})

describe('the Trash pane', () => {
  let host: HTMLDivElement | null = null
  let root: Root | null = null
  let listed: TrashRow[]
  let picked: string | null
  let mutated: ReturnType<typeof vi.fn>

  const titles = (): string[] =>
    [...(host?.querySelectorAll('[role="checkbox"]') ?? [])].map((n) =>
      (n.getAttribute('aria-label') ?? '').replace('Select ', ''),
    )
  const nexus = (id: string): void => {
    const tree = makeTree()
    useSession.setState({ tree: { ...tree, nexus: { ...tree.nexus, id } } })
  }

  beforeEach(async () => {
    listed = [row({ title: 'Alpha' })]
    picked = null
    mutated = vi.fn(async () => ({ ok: true, value: {} }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'trash:list': vi.fn(async () => ({ ok: true, value: listed })),
      menu: vi.fn(async () => ({ ok: true, value: picked })),
      'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
      mutate: mutated,
      'theme:systemAccent': vi.fn(async () => ({ ok: true, value: null })),
      'devicePrefs:load': vi.fn(async () => ({ ok: true, value: null })),
      'index:headings': vi.fn(async () => ({ ok: true, value: {} })),
      'delete:facts': vi.fn(async () => ({
        ok: true,
        value: { trashMode: 'nexus', permanentDelete: false },
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

  it("lists the opened Nexus's trash after a switch", async () => {
    expect(titles()).toEqual(['Alpha'])
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
    return useSession.getState().personalization.trashColumnStyle
  }

  it("goes back to following the Nexus when its date menu picks the Nexus's own form", async () => {
    await act(async () =>
      useSession.setState({
        personalization: { dateFormat: 'relative', trashColumnStyle: { date_format: 'full' } },
      }),
    )
    expect(await pickFromDateMenu('style:date_format:relative')).toBeUndefined()
  })

  it('stores a hidden time, and nothing once the time is back on the Nexus clock', async () => {
    await act(async () =>
      useSession.setState({ personalization: { timeFormat: 'twentyFourHour' } }),
    )
    expect(await pickFromDateMenu('style:time_format:none')).toEqual({ time_format: 'none' })
    expect(await pickFromDateMenu('style:time_format:twentyFourHour')).toBeUndefined()
  })

  it.each([
    ['restore', 'restore'],
    ['delete', 'emptyBundle'],
  ])('a %s here spends the bundle’s Undo, so the chord reaches the entry beneath', async (action, op) => {
    resetUndo()
    const older = vi.fn(() => true)
    pushUndo(older)
    const { bundlePath } = listed[0]
    notifyTrashed('Alpha', { trashed: { bundlePath } })
    useSession.setState({ askConfirm: async () => true })
    mutated.mockClear()
    picked = action
    const item = host?.querySelector('.trash-row') as HTMLElement
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
    notifyTrashed('Alpha', { trashed: { bundlePath } })
    mutated.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
    picked = 'restore'
    const item = host?.querySelector('.trash-row') as HTMLElement
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
    notifyTrashed('Alpha', { trashed: { bundlePath: listed[0].bundlePath } })
    for (const box of host?.querySelectorAll('[role="checkbox"]') ?? [])
      await act(async () => (box as HTMLButtonElement).click())
    picked = 'restoreAll'
    const item = host?.querySelector('.trash-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(mutated).toHaveBeenCalledTimes(2)
    expect(undoValue(null)).toBe(true)
    expect(older).toHaveBeenCalledTimes(1)
  })

  it('carries what a Delete All couldn’t strip into its notice', async () => {
    listed = [row({ title: 'Alpha' }), row({ title: 'Beta' })]
    await act(async () => nexus('B'))
    useSession.setState({ askConfirm: async () => true })
    const warning = 'Couldn’t update links in 1 file.'
    mutated.mockResolvedValue({ ok: true, value: { cascade: { pages: [], hosts: [], warning } } })
    for (const box of host?.querySelectorAll('[role="checkbox"]') ?? [])
      await act(async () => (box as HTMLButtonElement).click())
    picked = 'deleteAll'
    const item = host?.querySelector('.trash-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(currentNotification()).toMatchObject({
      message: `Deleted 2 pages. ${warning}`,
      tone: 'error',
    })
  })

  it('lists a delete made elsewhere while it is open', async () => {
    listed = [row({ title: 'Alpha' }), row({ title: 'Gamma' })]
    await act(async () => {
      await useSession.getState().mutate({ op: 'delete', path: 'Notes', kind: 'collection' })
    })
    expect(titles()).toEqual(['Alpha', 'Gamma'])
  })
})
