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

  it('checks itself through the checkbox in its lead inset', async () => {
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
    expect(host.querySelectorAll('.trash-row')).toHaveLength(1)
    expect(host.querySelector('[data-reveal-host="on"]')).toBeNull()
  })

  it('draws its item’s own icon ahead of its kind’s', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': vi.fn(async () => ({ ok: true, value: [row({ icon: 'hash' })] })),
    })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root?.render(<TrashFrame />))
    expect(host.querySelector('.lucide-hash')).not.toBeNull()
  })

  it('a partly recorded row shows its mark, spoken as Recorded Partly', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': vi.fn(async () => ({
        ok: true,
        value: [
          row({ title: 'Alpha', partial: true }),
          row({ title: 'Beta', bundlePath: '.trash/b' }),
        ],
      })),
    })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root?.render(<TrashFrame />))
    const [alpha, beta] = host.querySelectorAll('.trash-row')
    expect(alpha.querySelector('[role="img"][aria-label="Recorded Partly"]')).not.toBeNull()
    expect(beta.querySelector('[role="img"]')).toBeNull()
  })
})

describe('the Trash pane', () => {
  let host: HTMLDivElement | null = null
  let root: Root | null = null
  let listed: BundleRow[]
  let list: ReturnType<typeof vi.fn>
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
    list = vi.fn(async () => ({ ok: true, value: listed }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'bundles:list': list,
      menu: vi.fn(async () => ({ ok: true, value: picked })),
      'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
      mutate: mutated,
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
    offerUndo([bundlePath], (undo) => notifyDeleted('Alpha', undo))
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
    offerUndo([listed[0].bundlePath], (undo) => notifyDeleted('Alpha', undo))
    for (const box of host?.querySelectorAll('[role="checkbox"]') ?? [])
      await act(async () => (box as HTMLButtonElement).click())
    picked = 'restore'
    const item = host?.querySelector('.trash-row') as HTMLElement
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
    const item = host?.querySelector('.trash-row') as HTMLElement
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

  it('names the title a restore here stepped to', async () => {
    mutated.mockResolvedValue({ ok: true, value: { landedAs: 'Alpha (2)' } })
    picked = 'restore'
    const item = host?.querySelector('.trash-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(currentNotification()).toMatchObject({
      message: 'Restored “Alpha” as “Alpha (2)”',
      tone: 'normal',
    })
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

  it('a Restore All of rows with nowhere to go restores nothing and says only that', async () => {
    await pickForBoth('restore', [
      row({ title: 'Alpha', homeResolves: false }),
      row({ title: 'Beta', homeResolves: false }),
    ])
    expect(mutated).not.toHaveBeenCalled()
    expect(currentNotification()).toMatchObject({
      message: '2 Pages had nowhere to go — restore those one at a time to choose where.',
      tone: 'error',
    })
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

  it('lists a delete made elsewhere while it is open', async () => {
    listed = [row({ title: 'Alpha' }), row({ title: 'Gamma' })]
    await act(async () => {
      await useSession.getState().mutate({ op: 'delete', path: 'Notes', kind: 'collection' })
    })
    expect(titles()).toEqual(['Alpha', 'Gamma'])
  })
})
