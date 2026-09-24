import { useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { mirrorBody } from '../MarkdownPM/api'
import { docString } from '../MarkdownPM/docCache'
import {
  advanceHead,
  attachBody,
  bodyHead,
  type BodyMount,
  dropCacheDetail,
  fetchPageDetail,
  followBody,
  publishBody,
  readBodyBase,
  setBodyBase,
} from '../Session/pageDetailCache'
import { cancelPageSave, schedulePageSave, settlePageSave } from '../Session/saveScheduler'
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
        at = live.current.path
        leave = attachBody(at, mount, docString(next.state.doc))
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

/** An outside change to a page some editor holds merges into the shared head once, every mount follows the merge in place, and only text the disk doesn't hold yet is saved. */
export async function absorbLanding(path: string): Promise<void> {
  // The page's own save in flight names the base its typing grew from.
  await settlePageSave(path)
  const base = readBodyBase(path)?.text
  dropCacheDetail(path)
  const fresh = await fetchPageDetail(path)
  const head = bodyHead(path)
  if (!fresh || !head) return
  const merged =
    base === undefined
      ? { text: fresh.body, conflicted: true }
      : merge3(base, head.text, fresh.body)
  if (merged.conflicted) void host().ask('sync:captureLocal', path, head.text)
  setBodyBase(path, { text: fresh.body, hash: fresh.bodyHash })
  advanceHead(path, merged.text)
  followBody(path)
  if (merged.text === fresh.body) cancelPageSave(path)
  else schedulePageSave(path, merged.text)
}
