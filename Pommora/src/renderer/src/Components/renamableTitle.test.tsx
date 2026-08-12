// @vitest-environment jsdom
// The rename owner fence: one field ever mounts for a renaming path, resolved by declared
// host first, rank second (detail > sidebar), first-claim within a rank. A release with no
// surviving claimant abandons the rename — after a microtask, so StrictMode's simulated
// remount (and any same-act re-key) never kills a live session.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RenamableTitle } from './RenamableTitle'
import { useSession } from '../store'
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
