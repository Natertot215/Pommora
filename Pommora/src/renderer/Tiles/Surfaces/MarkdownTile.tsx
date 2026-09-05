import { useEffect, useRef, useState } from 'react'
import type { TileHostRef } from '@shared/tiles'
import { MarkdownEditor } from '@renderer/MarkdownPM'
import type { ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import { nativeEditorMenu } from '@renderer/MarkdownPM/Editor/menu'
import { createBodyWriter } from '../pageTileWrite'

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
  host: TileHostRef
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
    void window.nexus.tiles.readMarkdown(host, tileId).then((r) => {
      if (live) setBody(r.ok ? r.value.body : r.error.code === 'not-found' ? '' : null)
    })
    return () => {
      live = false
    }
  }, [tileId])

  const suppressRef = useRef(suppressFlush)
  suppressRef.current = suppressFlush
  // Leaving edit mode and unmounting both settle the pending write, unless the tile is being removed.
  useEffect(
    () => () => {
      if (suppressRef.current?.(tileId)) saves.cancel(tileId)
      else void saves.flush(tileId)
    },
    [editing, tileId],
  )

  const scheduleSave = (next: string): void =>
    saves.schedule(tileId, next, () =>
      suppressRef.current?.(tileId)
        ? Promise.resolve({ ok: true })
        : window.nexus.tiles.writeMarkdown(host, tileId, next),
    )

  if (body === null) return <div className="markdown-tile" />
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-to-edit surface over a contenteditable that is already keyboard-reachable
    <div
      className={`markdown-tile${editing ? ' is-editing' : ''}`}
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
