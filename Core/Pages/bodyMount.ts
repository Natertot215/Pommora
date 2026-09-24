import { useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { mirrorBody } from '../MarkdownPM/api'
import {
  attachBody,
  bodyHead,
  type BodyMount,
  followBody,
  publishBody,
} from '../Session/pageDetailCache'
import { schedulePageSave } from '../Session/saveScheduler'
import { host } from '../Platform/dialer'
import { merge3 } from './merge3'

interface BodySeat {
  register: (view: EditorView | null) => void
  save: (body: string) => void
}

/** Seats one editor of a page in its path's shared head. A keystroke typed while another mount's text hasn't reached this one merges onto the head before it saves. */
export function useBodyMount(path: string, onFollow?: (body: string) => void): BodySeat {
  const live = useRef({ path, onFollow })
  live.current = { path, onFollow }
  const [seat] = useState((): BodySeat => {
    let view: EditorView | null = null
    let at = path
    let leave: (() => void) | null = null
    const mount: BodyMount = {
      seq: 0,
      basis: '',
      follow: (body) => {
        const doc = view?.state.doc.toString()
        if (!view || doc !== mount.basis) return false
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
        at = live.current.path
        leave = attachBody(at, mount, next.state.doc.toString())
      },
      save: (body) => {
        const head = bodyHead(at)
        let text = body
        if (head && mount.seq !== head.seq) {
          const merged = merge3(mount.basis, body, head.text)
          if (merged.conflicted) void host().ask('sync:captureLocal', at, body)
          text = merged.text
        }
        publishBody(at, mount, text, body)
        schedulePageSave(at, text)
        // The keystroke's own update is still dispatching, so the merged text follows a microtask later.
        if (text !== body) queueMicrotask(() => followBody(at))
      },
    }
  })
  return seat
}
