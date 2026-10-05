import { useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { mirrorBody } from '../MarkdownPM/api'
import { docString } from '../MarkdownPM/docCache'
import {
  advanceHead,
  attachBody,
  bodyHead,
  type BodyMount,
  followBody,
  publishBody,
  readBodyBase,
  setBodyBase,
  writeThroughBody,
} from '../Session/pageDetailCache'
import { type BodyIO, pageIO, scheduleBodySave } from '../Session/saveScheduler'
import { merge3 } from './merge3'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

interface BodySeat {
  register: (view: EditorView | null) => void
  save: (body: string) => void
}

/** Seats one editor of a body in its key's shared head. A keystroke typed while another mount's text hasn't reached this one merges onto the head before it saves. */
export function useBodyMount(
  key: string,
  onFollow?: (body: string) => void,
  io: BodyIO = pageIO,
): BodySeat {
  const live = useLatest({ key, onFollow, io })
  const [seat] = useState((): BodySeat => {
    let view: EditorView | null = null
    let at = key
    let leave: (() => void) | null = null
    const mount: BodyMount = {
      seq: 0,
      basis: '',
      follow: (body) => {
        if (!view) return false
        const doc = docString(view.state.doc)
        if (doc !== mount.basis) return false
        if (doc !== body) {
          mirrorBody(view, body)
          live.current.onFollow?.(body)
        }
        return true
      },
    }
    return {
      register: (next) => {
        leave?.()
        leave = null
        view = next
        if (!next) return
        at = live.current.key
        leave = attachBody(at, mount, docString(next.state.doc))
      },
      save: (body) => {
        const { io } = live.current
        const head = bodyHead(at)
        let text = body
        if (head && mount.seq !== head.seq) {
          const merged = merge3(mount.basis, body, head.text)
          if (merged.conflicted) io.capture(at, body)
          text = merged.text
        }
        publishBody(at, mount, text, body)
        scheduleBodySave(at, text, io)
        // The keystroke's own update is still dispatching, so the merged text follows a microtask later.
        if (text !== body) queueMicrotask(() => followBody(at))
      },
    }
  })
  return seat
}

/** An outside change to a body some editor holds merges into the shared head once, every mount follows the merge in place, and only text the disk doesn't hold yet is saved. */
export async function absorbLanding(key: string, io: BodyIO = pageIO): Promise<void> {
  // The body's own save in flight names the base its typing grew from.
  await io.writer.settled(key)
  const base = readBodyBase(key)?.text
  const fresh = await io.read(key)
  const head = bodyHead(key)
  if (!fresh.ok || !head) return
  const { body, hash } = fresh.value
  const merged =
    base === undefined ? { text: body, conflicted: true } : merge3(base, head.text, body)
  if (merged.conflicted) io.capture(key, head.text)
  setBodyBase(key, { text: body, hash })
  advanceHead(key, merged.text)
  followBody(key)
  writeThroughBody(key, merged.text)
  if (merged.text === body) io.writer.cancel(key)
  else scheduleBodySave(key, merged.text, io)
}
