import { useEffect, useRef, useState } from 'react'
import type { BlockHostRef } from '@shared/blocks'
import { MarkdownEditor } from '@renderer/MarkdownPM'
import type { ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { nativeEditorMenu } from '@renderer/MarkdownPM/Editor/menu'
import { createBodyWriter } from './PageTileWrite'

// The markdown tile's body shares the page autosave's debounce machinery; a tile's id (a ULID) keys
// its pending write. Editability reconfigures the SAME CM6 view in place while this tile is the
// surface's single live editor — no remount, no jitter.
const saves = createBodyWriter()

export function MarkdownTile({
  host,
  tileId,
  editing,
  onBeginEdit,
  connections,
  suppressFlush,
  locked = false,
}: {
  host: BlockHostRef
  tileId: string
  editing: boolean
  onBeginEdit: (tileId: string) => void
  connections?: ConnectionsApi
  /** True while this tile is being removed — a flush then would land AFTER the
   *  trash and resurrect the file as an entry-less orphan. */
  suppressFlush?: (tileId: string) => boolean
  locked?: boolean
}): React.JSX.Element {
  const [body, setBody] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void window.nexus.blocks.readMarkdown(host, tileId).then((r) => {
      if (live) setBody(r.ok ? r.value.body : '')
    })
    return () => {
      live = false
    }
  }, [tileId])

  // On removal the pending write is dropped, not landed — a write after the trash would resurrect the
  // file as an entry-less orphan. The guard rides both the settle paths and the debounced write
  // itself, so a timer firing mid-removal can't slip a write through.
  const suppressRef = useRef(suppressFlush)
  suppressRef.current = suppressFlush
  const settleRef = useRef<() => void>(() => {})
  settleRef.current = () => {
    if (suppressRef.current?.(tileId)) saves.cancel(tileId)
    else void saves.flush(tileId)
  }
  useEffect(() => () => settleRef.current(), [])
  useEffect(() => {
    if (!editing) settleRef.current()
  }, [editing])

  const scheduleSave = (next: string): void =>
    saves.schedule(tileId, next, () =>
      suppressRef.current?.(tileId)
        ? Promise.resolve({ ok: true })
        : window.nexus.blocks.writeMarkdown(host, tileId, next),
    )

  if (body === null) return <div className="blk-md" />
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-to-edit surface over a contenteditable that is already keyboard-reachable
    <div
      className={`blk-md${editing ? ' is-editing' : ''}`}
      onClick={() => {
        if (editing || locked) return // locked: no edit entry; selection (portal is read-only) still works
        // Selecting rendered text to copy ends in a click — that's a copy, not an edit.
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed) return
        onBeginEdit(tileId)
      }}
    >
      <MarkdownEditor
        initialBody={body}
        onChange={scheduleSave}
        connections={connections}
        menu={nativeEditorMenu}
        readOnly={!editing}
        autoFocus
        edgeFade
      />
    </div>
  )
}
