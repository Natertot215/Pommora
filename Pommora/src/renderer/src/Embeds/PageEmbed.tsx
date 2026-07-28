import { useEffect, useRef, useState } from 'react'
import { MarkdownEditor, type WarmSeam } from '@renderer/MarkdownPM'
import type { ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { flushPageSave, schedulePageSave } from '@renderer/Detail/pageFlush'
import './embeds.css'
import { EMBED_SCALE, EMBED_ZOOM } from './embedScale'

// Entering edit reconfigures the SAME CM6 view's editability — no remount, no jitter. Header
// chrome (banner + title) is parked; returns with the ⋮ toggle pass.

export function PageEmbed({
  path,
  editing,
  onBeginEdit,
  connections,
  locked = false,
  onBody,
  warm,
}: {
  path: string
  editing: boolean
  onBeginEdit: () => void
  connections?: ConnectionsApi
  locked?: boolean
  /** The floating preview drives its own Subfield stats from a LOCAL buffer via this — never the
   *  shared `liveBody` slot (single-owner; a second writer would evict the main pane's count). */
  onBody?: (body: string) => void
  /** A restored entry mounts synchronously (its doc IS the body — no fetch/blank frame); capture
   *  fires at unmount. Block tiles mount cold (no warm prop passed). */
  warm?: WarmSeam
}): React.JSX.Element {
  // Bound to the path it was loaded FOR — an un-keyed host re-aiming `path` blanks and refetches
  // exactly as a fresh mount would.
  const [loaded, setLoaded] = useState<{ path: string; body: string } | null>(() => {
    const doc = (warm?.restore()?.editorState as { doc?: unknown } | undefined)?.doc
    return typeof doc === 'string' ? { path, body: doc } : null
  })
  const body = loaded?.path === path ? loaded.body : null

  const onBodyRef = useRef(onBody)
  onBodyRef.current = onBody
  useEffect(() => {
    if (body !== null) onBodyRef.current?.(body)
  }, [body])

  useEffect(() => {
    if (body !== null) return
    let live = true
    void window.nexus.openPage(path).then((r) => {
      if (live) setLoaded({ path, body: r.ok ? r.page.body : '' })
    })
    return () => {
      live = false
    }
  }, [path, body])

  // Writes are keyed to the path they were scheduled under (pageFlush) — a host re-aiming `path`
  // can never land the old page's body on the new one.
  useEffect(() => {
    if (!editing) void flushPageSave(path)
    return () => void flushPageSave(path)
  }, [editing, path])

  if (body === null) return <div className="pgembed" />
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-to-edit surface over a contenteditable that is already keyboard-reachable
    <div
      className={`pgembed${editing ? ' is-editing' : ''}`}
      style={{ '--mdpm-scale': EMBED_SCALE } as React.CSSProperties}
      onClick={() => {
        if (editing || locked) return // locked: no edit entry; selection still works
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed) return
        onBeginEdit()
      }}
    >
      <MarkdownEditor
        initialBody={body}
        onChange={(next) => {
          onBodyRef.current?.(next)
          schedulePageSave(path, next)
        }}
        connections={connections}
        readOnly={!editing}
        autoFocus
        zoom={EMBED_ZOOM}
        edgeFade
        warm={warm}
      />
    </div>
  )
}
