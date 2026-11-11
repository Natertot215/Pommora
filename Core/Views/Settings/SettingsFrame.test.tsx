// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '../../Nexus/tree'
import type { SavedView, ViewPatch } from '../views'
import { mountEachTest } from '../../Testing/viewHarness'
import { useSession } from '../../Session/store'
import { ViewTileScopeProvider } from '../ViewTileScope'
import { presentedKind } from '../Host/viewKinds'
import { makeTree } from '../../Testing/testTree'
import { SettingsFrame } from './SettingsFrame'
import {
  heading,
  scrollFrameBody,
  scrollFrameEdge,
  separator,
} from '@pommora/uix/Menus/menu-row.css'

const view: SavedView = {
  id: 'view_a',
  name: 'Board',
  type: 'cards',
  property_order: ['_title'],
  hidden_properties: [],
}
const source = {
  kind: 'collection',
  id: 'col1',
  title: 'Col',
  path: 'Col',
  sets: [],
  pages: [],
  propertyIds: [],
  views: [view],
} as unknown as CollectionNode

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})

beforeEach(() => {
  useSession.setState({ tree: { ...makeTree(), collections: [source] } })
})

let persist: ReturnType<typeof vi.fn<(patch: ViewPatch) => void>>

const mount = (shown: SavedView = view): Promise<void> =>
  act(async () => {
    persist = vi.fn<(patch: ViewPatch) => void>()
    root.render(
      <ViewTileScopeProvider
        value={{ source, view: shown, persist, locked: false, setLocked: vi.fn() }}
      >
        <SettingsFrame />
      </ViewTileScopeProvider>,
    )
  })
const open = async (entry: string, shown?: SavedView): Promise<void> => {
  await mount(shown)
  const row = [...host.querySelectorAll('[role="button"], button')].find(
    (e) => e.textContent === entry,
  )
  await act(async () => (row as HTMLElement).click())
}
const has = (label: string): boolean => host.querySelector(`[aria-label="${label}"]`) !== null
const listed = (): boolean =>
  [...host.querySelectorAll('[data-line-row]')].some((r) => r.textContent === 'Title')
const switches = presentedKind(view.type).layout.leafSwitches!.map((s) => s.label)

describe('SettingsFrame — the panes Settings reaches', () => {
  it('lists Properties and every view pane, Visibility and Layout apart', async () => {
    await mount()
    const labels = [...host.querySelectorAll('[role="button"]')].map((e) => e.textContent)
    expect(labels).toEqual(
      expect.arrayContaining(['Properties', 'Visibility', 'Layout', 'Group', 'Filter', 'Sort']),
    )
  })

  it('Visibility is the list alone', async () => {
    await open('Visibility')
    expect(listed()).toBe(true)
    expect(switches.some(has)).toBe(false)
  })

  it('Layout is the type grid and the kind’s switches, without the list', async () => {
    await open('Layout')
    expect(has('Table')).toBe(true)
    expect(switches.every(has)).toBe(true)
    expect(listed()).toBe(false)
  })

  it.each([
    'table',
    'cards',
  ] as const)('a %s view’s Title Icons switch shows page icons on and writes hiding them', async (type) => {
    await open('Layout', { ...view, type })
    const titleIcons = host.querySelector(
      '[role="switch"][aria-label="Title Icons"]',
    ) as HTMLElement
    expect(titleIcons.getAttribute('aria-checked')).toBe('true')
    await act(async () => titleIcons.click())
    expect(persist).toHaveBeenCalledWith({ hide_page_icons: true })
  })

  it('a list view’s Visibility is the two columns', async () => {
    await open('Visibility', { ...view, type: 'list' })
    expect(
      [...host.querySelectorAll(`.${heading.split(' ').join('.')}`)].map((h) => h.textContent),
    ).toEqual(['Left', 'Right'])
  })

  it('a list view’s Layout is the type grid over its three switches in the footing, with no section between', async () => {
    await open('Layout', { ...view, type: 'list' })
    const body = [...host.querySelectorAll(`.${scrollFrameBody}`)].at(-1)!
    expect(body.querySelector('[aria-label="Table"]')).not.toBeNull()
    expect(body.querySelector(`.${separator}`)).toBeNull()
    expect(body.querySelector('[role="switch"]')).toBeNull()
    for (const label of ['Title Icons', 'Outlines', 'Wrap Rows'])
      expect(
        body.parentElement!.querySelector(
          `.${scrollFrameEdge} [role="switch"][aria-label="${label}"]`,
        ),
      ).not.toBeNull()
  })
})
