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
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const tree = {
  nexus: { id: 'nx', rootPath: '/x', name: 'x', profileImage: null, profileSubtitle: '' },
  homepage: { headingIconHidden: false },
  crops: {},
  pageMetadata: { p1: { icon: 'rocket' } },
  contexts: [
    {
      def: { id: 'g1', title: 'Areas', icon: 'star' },
      spaces: [{ kind: 'space', id: 'sp1', title: 'Health', path: 'Areas/Health.json' }],
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
  personalization: { defaultIcons: {} },
  commands: DEFAULT_COMMANDS,
  assetDirectory: ASSETS_DIR_REL,
  excluded: [],
  registry: [],
} as unknown as NexusTree

let host: HTMLDivElement
let root: Root
let mutate: ReturnType<typeof vi.fn>

const mount = (sidebarMode: SidebarMode): void => {
  mutate = vi.fn(async () => {})
  useSession.setState({
    tree,
    devicePrefs: { disclosure: { c1: true } },
    setDevicePref: vi.fn() as never,
    personalization: { defaultIcons: {}, iconFavorites: ['anchor'], sidebarMode },
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
