import { useEffect, useState } from 'react'
import type { TileHostRef } from '../tiles'
import { MarkdownEditor } from '../../MarkdownPM/MarkdownEditor'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { useEditorHost } from '../../Pages/editorHost'
import { useBodyMount } from '../../Pages/bodyMount'
import { bodyHead, knownBody, setBodyBase } from '../../Session/pageDetailCache'
import { tileBody, tileBodyWriter } from '../tileDocStore'

export function MarkdownTile({
  host,
  tileId,
  editing,
  onBeginEdit,
  connections,
  locked = false,
}: {
  host: TileHostRef
  tileId: string
  editing: boolean
  onBeginEdit: (tileId: string) => void
  connections?: ConnectionsApi
  locked?: boolean
}): React.JSX.Element {
  const io = tileBody(host)
  const [body, setBody] = useState(() => knownBody(tileId) ?? null)
  const editorHost = useEditorHost({ connections })
  const seat = useBodyMount(tileId, undefined, io)

  // Only a tile this window holds no text of reads its file; a read that merely failed stays blank rather than drawing an empty tile the next keystroke would save.
  useEffect(() => {
    if (body !== null) return
    let live = true
    void io.read(tileId).then((r) => {
      if (!live) return
      if (r.ok && !bodyHead(tileId)) setBodyBase(tileId, { text: r.value.body, hash: r.value.hash })
      if (r.ok || r.error.code === 'not-found') setBody(r.ok ? r.value.body : '')
    })
    return () => {
      live = false
    }
  }, [tileId])

  // Leaving the edit sends its typing, and the save brings every other mount of the tile up to it before another can be clicked into.
  useEffect(() => () => void tileBodyWriter.flush(tileId), [editing, tileId])

  if (body === null) return <div className="markdown-tile" />
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-to-edit surface over a contenteditable that is already keyboard-reachable
    <div
      className="markdown-tile"
      onClick={() => {
        if (editing || locked) return
        // Selecting rendered text to copy ends in a click — that's a copy, not an edit.
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed) return
        onBeginEdit(tileId)
      }}
    >
      <MarkdownEditor
        initialBody={body}
        onChange={seat.save}
        register={seat.register}
        host={editorHost}
        connections={connections}
        readOnly={!editing}
        autoFocus
        edgeFade
      />
    </div>
  )
}
