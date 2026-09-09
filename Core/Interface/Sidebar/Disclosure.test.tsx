// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { ASSETS_DIR_REL } from '@pommora/core/Paths/nexusPaths'
import { Sidebar } from './Sidebar'
import { Disclosure } from './Disclosure'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
import { DEFAULT_COMMANDS } from '../../Actions/commands'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const tree = {
  nexus: { id: 'nx', rootPath: '/x', name: 'x', profileImage: null, profileSubtitle: '' },
  homepage: { headingIconHidden: false },
  crops: {},
  contexts: [],
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
  accent: 'lavender',
  personalization: { defaultIcons: {} },
  commands: DEFAULT_COMMANDS,
  assetDirectory: ASSETS_DIR_REL,
  excluded: [],
  registry: [],
} as unknown as NexusTree

let host: HTMLDivElement
let root: Root
let setDevicePref: ReturnType<typeof vi.fn>

const mount = (disclosure: Record<string, boolean>): void => {
  setDevicePref = vi.fn()
  useSession.setState({
    devicePrefs: { disclosure },
    setDevicePref: setDevicePref as never,
    personalization: { defaultIcons: {} },
    selection: { kind: 'none' },
  })
  act(() => root.render(<Sidebar tree={tree} />))
}

const rowNamed = (title: string): HTMLElement => {
  const found = Array.from(host.querySelectorAll<HTMLElement>('.row')).find((r) =>
    r.textContent?.includes(title),
  )
  if (!found) throw new Error(`no sidebar row named ${title}`)
  return found
}

const shows = (title: string): boolean =>
  Array.from(host.querySelectorAll<HTMLElement>('.row')).some((r) => r.textContent?.includes(title))

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({})
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('a sidebar group opens from the device store', () => {
  it('reads its fold out of the disclosure map rather than its default', () => {
    mount({ c1: true })
    expect(shows('First')).toBe(true)
  })

  it('falls back to its default when the map names it nowhere', () => {
    mount({})
    expect(shows('First')).toBe(false)
  })

  it('merges one key on a toggle, leaving every sibling fold alone', () => {
    mount({ 'context:areas': false })
    act(() => rowNamed('Notes').click())
    expect(setDevicePref).toHaveBeenCalledWith('disclosure', {
      'context:areas': false,
      c1: true,
    })
  })
})

describe('a locked disclosure', () => {
  it('routes a header click on a closed group to its selection instead of a fold', () => {
    const onSelect = vi.fn()
    setDevicePref = vi.fn()
    useSession.setState({ devicePrefs: {}, setDevicePref: setDevicePref as never })
    act(() =>
      root.render(
        <Disclosure
          icon="folder-closed"
          title="Locked"
          depth={0}
          defaultOpen={false}
          persistKey="k"
          locked
          onSelect={onSelect}
        >
          <span>child</span>
        </Disclosure>,
      ),
    )
    act(() => rowNamed('Locked').click())
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(setDevicePref).not.toHaveBeenCalled()
  })
})
