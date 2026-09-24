import { useEffect, useRef, useState } from 'react'
import type { TileHostRef } from '@pommora/core/Tiles/tiles'
import { MarkdownEditor } from '../../MarkdownPM/MarkdownEditor'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { useEditorHost } from '../../Pages/editorHost'
import {
  readTileBody,
  settleTileBody,
  subscribeTileBody,
  tileBodyWriter,
  writeTileBody,
} from '../tileDocStore'
import { host as dialer } from '../../Platform/dialer'
import { ok } from '@pommora/core/Contract/result'

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
  /** A flush while a tile is being removed would land AFTER the trash and resurrect the file as an entry-less orphan. */
  suppressFlush?: (tileId: string) => boolean
  locked?: boolean
}): React.JSX.Element {
  const [seed, setSeed] = useState<{ no: number; editing: boolean; text: string | null }>({
    no: 0,
    editing,
    text: null,
  })
  // The mount that did the typing must find its own text on re-entry and keep its editor, or the edit's undo history is gone.
  const mine = useRef<string | null>(null)
  const editorHost = useEditorHost({ connections })
  if (seed.editing !== editing) {
    const held = editing ? readTileBody(tileId) : null
    if (held !== null && held !== (mine.current ?? seed.text)) {
      mine.current = held
      setSeed((s) => ({ no: s.no + 1, editing, text: held }))
    } else setSeed((s) => ({ ...s, editing }))
  }

  useEffect(() => {
    // Another mount's typing is newer than the file, so the slot leads the disk whenever it holds this tile.
    const held = readTileBody(tileId)
    if (held !== null) {
      setSeed((s) => ({ no: s.no + 1, editing: s.editing, text: held }))
      return
    }
    let live = true
    void dialer()
      .ask('tiles:readMarkdown', host, tileId)
      .then((r) => {
        if (!live) return
        setSeed((s) => ({
          no: s.no + 1,
          editing: s.editing,
          text: r.ok ? r.value.body : r.error.code === 'not-found' ? '' : null,
        }))
      })
    return () => {
      live = false
    }
  }, [tileId])

  // A mount that is not editing follows the typing mount in place, once per landed save; its editor keeps its scroll and its key.
  useEffect(() => {
    if (editing) return
    return subscribeTileBody(tileId, () => {
      const held = readTileBody(tileId)
      if (held === null || held === mine.current) return
      mine.current = null
      setSeed((s) => (held === s.text ? s : { ...s, text: held }))
    })
  }, [editing, tileId])

  const suppressRef = useRef(suppressFlush)
  suppressRef.current = suppressFlush
  useEffect(
    () => () => {
      if (suppressRef.current?.(tileId)) tileBodyWriter.cancel(tileId)
      else void tileBodyWriter.flush(tileId)
    },
    [editing, tileId],
  )

  const scheduleSave = (next: string): void => {
    // Synchronous, before the debounce and before any await: the slot must hold what was typed by the time the next pointerdown moves the edit to another mount.
    writeTileBody(tileId, next)
    mine.current = next
    tileBodyWriter.schedule(tileId, () => {
      settleTileBody(tileId)
      return suppressRef.current?.(tileId)
        ? Promise.resolve(ok(null))
        : dialer().ask('tiles:writeMarkdown', host, tileId, next)
    })
  }

  const body = seed.text
  if (body === null) return <div className="markdown-tile" />
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-to-edit surface over a contenteditable that is already keyboard-reachable
    <div
      className={`markdown-tile${editing ? ' is-editing' : ''}`}
      onClick={() => {
        if (editing || locked) return
        // Selecting rendered text to copy ends in a click — that's a copy, not an edit.
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed) return
        onBeginEdit(tileId)
      }}
    >
      <MarkdownEditor
        key={seed.no}
        initialBody={body}
        body={editing ? undefined : body}
        onChange={scheduleSave}
        host={editorHost}
        connections={connections}
        readOnly={!editing}
        autoFocus
        edgeFade
      />
    </div>
  )
}
