// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { NexusTree } from '../../Nexus/tree'
import type { SidebarMode } from '../../Settings/personalization'
import { ASSETS_DIR_REL, contextDirRel } from '../../Paths/nexusPaths'
import { Sidebar } from './Sidebar'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
import { DEFAULT_COMMANDS } from '../../Actions/commands'
import { cellSelected } from '@pommora/uix/Pickers/icon-picker.css'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const tree = {
  nexus: { id: 'nx', rootPath: '/x', name: 'x' },
  contexts: [
    {
      def: { id: 'g1', title: 'Areas', icon: 'star' },
      spaces: [
        { kind: 'space', id: 'sp1', title: 'Health', path: 'Areas/Health.json', icon: 'moon' },
      ],
    },
  ],
  collections: [
    {
      kind: 'collection',
      id: 'c1',
      title: 'Notes',
      path: 'Notes',
      sets: [],
      pages: [{ kind: 'page', id: 'p1', title: 'First', path: 'Notes/First.md' }],
    },
  ],
  config: {
    profileImage: null,
    homepage: { headingIconHidden: false },
    crops: {},
    pageMetadata: { p1: { icon: 'rocket' } },
    personalization: { defaultIcons: {} },
    commands: DEFAULT_COMMANDS,
    assetDirectory: ASSETS_DIR_REL,
    excluded: [],
    registry: [],
  },
} as unknown as NexusTree

let host: HTMLDivElement
let root: Root
let mutate: ReturnType<typeof vi.fn>

const mount = (sidebarMode: SidebarMode): void => {
  mutate = vi.fn(async () => {})
  useSession.setState({
    tree: {
      ...tree,
      config: {
        ...tree.config,
        personalization: {
          defaultIcons: {},
          iconFavorites: ['anchor', 'rocket', 'moon', 'star'],
          sidebarMode,
        },
      },
    },
    devicePrefs: { disclosure: { c1: true } },
    setDevicePref: vi.fn() as never,
    selection: { kind: 'none' },
    mutate: mutate as never,
  })
  act(() => root.render(<Sidebar tree={tree} />))
}

const panes = (): number => document.querySelectorAll('[data-picker-portal]').length

const pickFavorite = (path: string): void => {
  act(() => useSession.getState().beginIcon(path, 'sidebar'))
  const favorite = document.querySelector<HTMLButtonElement>(
    '[data-picker-portal] button[title="anchor"]',
  )
  if (!favorite) throw new Error(`no picker opened for ${path}`)
  act(() => favorite.click())
}

const preselected = (path: string): string[] => {
  act(() => useSession.getState().beginIcon(path, 'sidebar'))
  const cells = document.querySelectorAll<HTMLButtonElement>('[data-picker-portal] button')
  const titles = [...cells].filter((b) => b.classList.contains(cellSelected)).map((b) => b.title)
  act(() => useSession.getState().endIcon())
  return titles
}

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({})
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  act(() => useSession.getState().endIcon())
})

describe('the sidebar icon picker', () => {
  it('mounts no picker until Edit Icon opens one', () => {
    mount('collections')
    expect(panes()).toBe(0)
  })

  it('sets a page icon from the row it opened over', () => {
    mount('collections')
    pickFavorite('Notes/First.md')
    expect(mutate).toHaveBeenCalledWith({
      op: 'setIcon',
      path: 'Notes/First.md',
      kind: 'page',
      icon: 'anchor',
    })
    expect(useSession.getState().iconPath).toBeNull()
  })

  it('sets a Space icon and a Context icon under their own kinds', () => {
    mount('contexts')
    pickFavorite('Areas/Health.json')
    pickFavorite(contextDirRel('Areas'))
    expect(mutate.mock.calls.map(([req]) => [req.path, req.kind])).toEqual([
      ['Areas/Health.json', 'space'],
      [contextDirRel('Areas'), 'context'],
    ])
  })
})

describe('the sidebar icon picker preselection', () => {
  it("opens on the row's own icon, for a Page, a Space, and a Context", () => {
    mount('collections')
    expect(preselected('Notes/First.md')).toEqual(['Rocket'])
    mount('contexts')
    expect(preselected('Areas/Health.json')).toEqual(['Moon'])
    expect(preselected(contextDirRel('Areas'))).toEqual(['Star'])
  })
})

describe('the sidebar create control', () => {
  it('mints a fresh ID for each create it sends', async () => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      menu: () => ({ ok: true, value: 'create' }),
    })
    mount('collections')
    const body = document.querySelector<HTMLElement>('.mode-body')
    if (!body) throw new Error('no mode body')
    for (let i = 0; i < 2; i++)
      await act(async () => {
        body.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
      })
    const ids = mutate.mock.calls.map(([req]) => req.id)
    expect(mutate.mock.calls.map(([req]) => req.op)).toEqual(['createContainer', 'createContainer'])
    expect(ids[0]).not.toBe(ids[1])
  })
})
