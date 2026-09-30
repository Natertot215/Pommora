import { useEffect, useRef, useState } from 'react'
import type { TileHostRef } from '../tiles'
import { MarkdownEditor } from '../../MarkdownPM/MarkdownEditor'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { useEditorHost } from '../../Pages/editorHost'
import {
  readTileBase,
  readTileBody,
  setTileBase,
  settleTileBody,
  subscribeTileBody,
  tileBodyWriter,
  writeTileBody,
} from '../tileDocStore'
import { dialer } from '../../Platform/dialer'
import { ok } from '../../Contract/result'
import { merge3 } from '../../Pages/merge3'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { cx } from '@pommora/uix/Utilities/cx'

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
      // Leaving the edit, the tile rests on the newest typed text rather than the text it mounted with.
    } else
      setSeed((s) => ({ ...s, editing, text: editing ? s.text : (readTileBody(tileId) ?? s.text) }))
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
          if (r.ok) setTileBase(tileId, { text: r.value.body, hash: r.value.hash })
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

  const suppressRef = useLatest(suppressFlush)
  const editingRef = useLatest(editing)
  useEffect(
    () => () => {
      if (suppressRef.current?.(tileId)) tileBodyWriter.cancel(tileId)
      else void tileBodyWriter.flush(tileId)
    },
    [editing, tileId],
  )

  // Every other mount follows the slot; the editing mount holds no subscription, so it re-seeds itself.
  const land = (text: string): void => {
    writeTileBody(tileId, text)
    settleTileBody(tileId)
    if (!editingRef.current) return
    mine.current = text
    setSeed((s) => ({ no: s.no + 1, editing: s.editing, text }))
  }

  const scheduleSave = (next: string): void => {
    // Synchronous, before the debounce and before any await: the slot must hold what was typed by the time the next pointerdown moves the edit to another mount.
    writeTileBody(tileId, next)
    mine.current = next
    tileBodyWriter.schedule(tileId, async () => {
      // A drop since the keystroke may have emptied the slot; the save refills it before the others follow.
      writeTileBody(tileId, next)
      settleTileBody(tileId)
      if (suppressRef.current?.(tileId)) return ok(null)
      const sent = await dialer().ask(
        'tiles:writeMarkdown',
        host,
        tileId,
        next,
        readTileBase(tileId)?.hash ?? '',
      )
      if (!sent.ok) return sent
      if (!sent.value.stale) {
        setTileBase(tileId, { text: next, hash: sent.value.hash })
        return sent
      }
      // The file moved without this window: the typing merges onto what the file holds now, and the merge saves in its place.
      const fresh = await dialer().ask('tiles:readMarkdown', host, tileId)
      if (!fresh.ok) return sent
      const base = readTileBase(tileId)
      const local = readTileBody(tileId) ?? next
      const merged = base ? merge3(base.text, local, fresh.value.body).text : fresh.value.body
      setTileBase(tileId, { text: fresh.value.body, hash: fresh.value.hash })
      land(merged)
      if (merged === fresh.value.body) tileBodyWriter.cancel(tileId)
      else scheduleSave(merged)
      return sent
    })
  }

  const body = seed.text
  if (body === null) return <div className="markdown-tile" />
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-to-edit surface over a contenteditable that is already keyboard-reachable
    <div
      className={cx('markdown-tile', editing && 'is-editing')}
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
