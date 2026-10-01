// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { NexusTree } from '../../Nexus/tree'
import { ASSETS_DIR_REL } from '../../Paths/nexusPaths'
import { Sidebar } from './Sidebar'
import { Disclosure, signalPeek } from './Disclosure'
import { SidebarDnd } from './sidebarDnd'
import { buildIndex } from './sidebarDndModel'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
import { DEFAULT_COMMANDS } from '../../Actions/commands'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const tree = {
  nexus: { id: 'nx', rootPath: '/x', name: 'x' },
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
  config: {
    profileImage: null,
    homepage: { headingIconHidden: false },
    crops: {},
    pageMetadata: {},
    personalization: { defaultIcons: {} },
    commands: DEFAULT_COMMANDS,
    assetDirectory: ASSETS_DIR_REL,
    excluded: [],
    registry: [],
  },
} as unknown as NexusTree

let host: HTMLDivElement
let root: Root
let setDevicePref: ReturnType<typeof vi.fn>

const mount = (disclosure: Record<string, boolean>): void => {
  setDevicePref = vi.fn()
  useSession.setState({
    devicePrefs: { disclosure },
    setDevicePref: setDevicePref as never,
    tree,
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

  it('drops the key when a toggle returns a group to its default', () => {
    mount({ c1: true })
    act(() => rowNamed('Notes').click())
    expect(setDevicePref).toHaveBeenCalledWith('disclosure', { c1: undefined })
  })
})

describe('a locked disclosure', () => {
  it('routes a header click on a closed group to its selection instead of a fold', () => {
    const onSelect = vi.fn()
    setDevicePref = vi.fn()
    useSession.setState({ devicePrefs: {}, setDevicePref: setDevicePref as never })
    act(() =>
      root.render(
        <SidebarDnd index={buildIndex(tree)} onCommit={() => {}}>
          <Disclosure
            icon="folder-closed"
            title="Locked"
            depth={0}
            defaultOpen={false}
            persistKey="k"
            dragId="k"
            locked
            onSelect={onSelect}
          >
            <span>child</span>
          </Disclosure>
        </SidebarDnd>,
      ),
    )
    act(() => rowNamed('Locked').click())
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(setDevicePref).not.toHaveBeenCalled()
  })

  it('peeks a newcomer landed in its own folder, not one landed elsewhere', () => {
    useSession.setState({ devicePrefs: {} })
    act(() =>
      root.render(
        <SidebarDnd index={buildIndex(tree)} onCommit={() => {}}>
          <Disclosure
            icon="folder-closed"
            title="Locked"
            depth={0}
            defaultOpen={false}
            persistKey="k"
            dragId="k"
            locked
            selfPath="Notes"
          >
            <span key="p1">First</span>
          </Disclosure>
        </SidebarDnd>,
      ),
    )
    act(() => signalPeek('Elsewhere', 'p1'))
    expect(host.querySelector('.children-peek')).toBeNull()
    act(() => signalPeek('Notes', 'p1'))
    expect(host.querySelector('.children-peek')).not.toBeNull()
  })
})

describe('the folder lock', () => {
  const lockOf = (): HTMLElement | null =>
    rowNamed('Locked').querySelector(
      'button[aria-label="Unlock Folder"], button[aria-label="Lock Folder"]',
    )
  const pointer = (type: 'pointerover' | 'pointerout', el: Element): void => {
    act(() => {
      el.dispatchEvent(Object.assign(new MouseEvent(type, { bubbles: true }), { pointerId: 1 }))
    })
  }
  let unlockElsewhere: () => void
  function Folder(): React.JSX.Element {
    const [locked, setLocked] = useState(true)
    unlockElsewhere = () => setLocked(false)
    return (
      <SidebarDnd index={buildIndex(tree)} onCommit={() => {}}>
        <Disclosure
          icon="folder-closed"
          title="Locked"
          depth={0}
          defaultOpen={false}
          persistKey="k"
          dragId="k"
          locked={locked}
          onSetLock={setLocked}
        >
          <span>child</span>
        </Disclosure>
      </SidebarDnd>
    )
  }
  beforeEach(() => {
    useSession.setState({ devicePrefs: {}, setDevicePref: vi.fn() as never })
    act(() => root.render(<Folder />))
    pointer('pointerover', rowNamed('Locked'))
  })

  it('an unlock pressed on the lock keeps it until the pointer leaves the row', () => {
    act(() => lockOf()?.click())
    expect(lockOf()?.getAttribute('aria-label')).toBe('Lock Folder')
    pointer('pointerout', rowNamed('Locked'))
    expect(lockOf()).toBeNull()
  })

  it('an unlock from elsewhere takes the lock away at once', () => {
    act(() => unlockElsewhere())
    expect(lockOf()).toBeNull()
  })
})
