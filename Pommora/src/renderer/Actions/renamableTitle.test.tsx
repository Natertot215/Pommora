// @vitest-environment jsdom
// The rename owner fence: one field ever mounts for a renaming path, resolved by declared
// host first, rank second (detail > sidebar), first-claim within a rank. A release with no
// surviving claimant abandons the rename — after a microtask, so StrictMode's simulated
// remount (and any same-act re-key) never kills a live session.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RenamableTitle } from './RenamableTitle'
import { useSession } from '@renderer/store'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PATH = 'Col/Page.md'

function Fields({ sidebar = true, detail = true }: { sidebar?: boolean; detail?: boolean }) {
  return (
    <>
      {sidebar && (
        <span data-host="sidebar">
          <RenamableTitle path={PATH} kind="page" title="Page" className="t" host="sidebar" />
        </span>
      )}
      {detail && (
        <span data-host="detail">
          <RenamableTitle path={PATH} kind="page" title="Page" className="t" host="detail" />
        </span>
      )}
    </>
  )
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  useSession.getState().cancelRename()
})

const inputs = (): HTMLInputElement[] => Array.from(host.querySelectorAll('input'))
const inputHost = (): string | null =>
  host.querySelector('input')?.closest('[data-host]')?.getAttribute('data-host') ?? null

const flushMicrotasks = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('the rename owner fence', () => {
  it('mounts exactly one field for two hosts, the detail rank winning', async () => {
    await act(async () => root.render(<Fields />))
    await act(async () => useSession.getState().beginRename(PATH))
    expect(inputs()).toHaveLength(1)
    expect(inputHost()).toBe('detail')
  })

  it('a declared host outranks the rank order', async () => {
    await act(async () => root.render(<Fields />))
    await act(async () => useSession.getState().beginRename(PATH, false, 'sidebar'))
    expect(inputs()).toHaveLength(1)
    expect(inputHost()).toBe('sidebar')
  })

  it('a lone sidebar claimant wins by default', async () => {
    await act(async () => root.render(<Fields detail={false} />))
    await act(async () => useSession.getState().beginRename(PATH))
    expect(inputs()).toHaveLength(1)
    expect(inputHost()).toBe('sidebar')
  })

  it('survives a StrictMode double mount', async () => {
    await act(async () =>
      root.render(
        <React.StrictMode>
          <Fields />
        </React.StrictMode>,
      ),
    )
    await act(async () => useSession.getState().beginRename(PATH))
    await flushMicrotasks()
    expect(useSession.getState().renamingPath).toBe(PATH)
    expect(inputs()).toHaveLength(1)
  })

  it('a real unmount with no surviving claimant abandons the rename', async () => {
    await act(async () => root.render(<Fields />))
    await act(async () => useSession.getState().beginRename(PATH))
    expect(inputs()).toHaveLength(1)
    await act(async () => root.render(<span />))
    await flushMicrotasks()
    expect(useSession.getState().renamingPath).toBeNull()
  })

  it('the winner unmounting hands nothing to a lower rank — the rename abandons', async () => {
    await act(async () => root.render(<Fields />))
    await act(async () => useSession.getState().beginRename(PATH))
    expect(inputHost()).toBe('detail')
    await act(async () => root.render(<Fields detail={false} />))
    await flushMicrotasks()
    expect(useSession.getState().renamingPath).toBeNull()
    expect(inputs()).toHaveLength(0)
  })

  it('a create-origin session opens the surviving field empty', async () => {
    await act(async () => root.render(<Fields />))
    await act(async () => useSession.getState().beginRename(PATH, true))
    expect(inputs()[0].value).toBe('')
  })

  it('an unclaimed session self-heals after the claim beat — no field ever mounted', async () => {
    // A newborn a filter hides (or a navigate-away mid-create) would otherwise strand the
    // session: ghosts suppressed all session, and an unprompted empty field opening later.
    vi.useFakeTimers()
    try {
      await act(async () => root.render(<span />))
      await act(async () => useSession.getState().beginRename('Ghost/Page.md', true))
      expect(useSession.getState().renamingPath).toBe('Ghost/Page.md')
      await act(async () => {
        vi.advanceTimersByTime(2100)
      })
      expect(useSession.getState().renamingPath).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a claim inside the beat keeps the session alive', async () => {
    vi.useFakeTimers()
    try {
      await act(async () => root.render(<Fields detail={false} />))
      await act(async () => useSession.getState().beginRename(PATH))
      await act(async () => {
        vi.advanceTimersByTime(2100)
      })
      expect(useSession.getState().renamingPath).toBe(PATH)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a standing twin of the same host never inherits the session', async () => {
    // The same path fielded twice at one host (a container visible in the main view AND an
    // embed): the winner unmounting mid-typing must abandon, not hand the other field a
    // focus-steal with the whole title selected.
    const Twins = ({ first = true }: { first?: boolean }): React.JSX.Element => (
      <>
        {first && (
          <span data-host="detail">
            <RenamableTitle path={PATH} kind="page" title="Page" className="t" host="detail" />
          </span>
        )}
        <span data-host="detail">
          <RenamableTitle path={PATH} kind="page" title="Page" className="t" host="detail" />
        </span>
      </>
    )
    await act(async () => root.render(<Twins />))
    await act(async () => useSession.getState().beginRename(PATH))
    expect(inputs()).toHaveLength(1)
    await act(async () => root.render(<Twins first={false} />))
    await flushMicrotasks()
    expect(useSession.getState().renamingPath).toBeNull()
    expect(inputs()).toHaveLength(0)
  })

  it("an old field's release never kills a successor session whose row hasn't mounted", async () => {
    // Main pushes begin-rename for a fresh create before the renderer's tree carries the row —
    // the outgoing field's release must judge its OWN claim's path, not the new session's.
    await act(async () => root.render(<Fields />))
    await act(async () => useSession.getState().beginRename(PATH))
    expect(inputs()).toHaveLength(1)
    await act(async () => {
      useSession.getState().beginRename('Other/New.md', true)
      root.render(<span />)
    })
    await flushMicrotasks()
    expect(useSession.getState().renamingPath).toBe('Other/New.md')
  })
})
