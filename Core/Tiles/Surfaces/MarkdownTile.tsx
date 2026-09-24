import { useEffect, useRef, useState } from 'react'
import type { TileHostRef } from '@pommora/core/Tiles/tiles'
import { MarkdownEditor } from '../../MarkdownPM/MarkdownEditor'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { useEditorHost } from '../../Pages/editorHost'
import {
  dropTileBodies,
  readTileBase,
  readTileBody,
  setTileBase,
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

  // The file on disk re-seeds the editor under a new key.
  const reread = useRef<() => void>(() => {})
  useEffect(() => {
    let live = true
    reread.current = () =>
      void dialer()
        .ask('tiles:readMarkdown', host, tileId)
        .then((r) => {
          if (!live) return
          if (r.ok) setTileBase(tileId, r.value.hash)
          mine.current = null
          setSeed((s) => ({
            no: s.no + 1,
            editing: s.editing,
            text: r.ok ? r.value.body : r.error.code === 'not-found' ? '' : null,
          }))
        })
    // Another mount's typing is newer than the file, so the slot leads the disk whenever it holds this tile.
    const held = readTileBody(tileId)
    if (held !== null) setSeed((s) => ({ no: s.no + 1, editing: s.editing, text: held }))
    else reread.current()
    return () => {
      live = false
    }
  }, [tileId])

  // A mount that is not editing follows the typing mount in place, once per landed save; its editor keeps its scroll and its key. An emptied slot means the file moved on without this window, so it reads the file again.
  useEffect(() => {
    if (editing) return
    return subscribeTileBody(tileId, () => {
      const held = readTileBody(tileId)
      if (held === null) return reread.current()
      if (held === mine.current) return
      mine.current = null
      setSeed((s) => (held === s.text ? s : { ...s, text: held }))
    })
  }, [editing, tileId])

  const suppressRef = useRef(suppressFlush)
  suppressRef.current = suppressFlush
  const editingRef = useRef(editing)
  editingRef.current = editing
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
    tileBodyWriter.schedule(tileId, async () => {
      settleTileBody(tileId)
      if (suppressRef.current?.(tileId)) return ok(null)
      const r = await dialer().ask('tiles:writeMarkdown', host, tileId, next, readTileBase(tileId))
      if (r.ok && !r.value.stale) setTileBase(tileId, r.value.hash)
      // The host kept the refused text as a capture; the file on disk is what every mount shows from here.
      else if (r.ok) {
        tileBodyWriter.cancel(tileId)
        // Every mount not editing reads the file on the drop; an editing mount holds no subscription, so it reads here.
        dropTileBodies([tileId])
        if (editingRef.current) reread.current()
      }
      return r
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
