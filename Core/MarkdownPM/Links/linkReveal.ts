import { StateEffect, StateField, type Transaction } from '@codemirror/state'
import type { LinkOccurrence } from '../../Connections/connections'
import { docScan } from '../docCache'
import type { DocScan } from '../Engine/docScan'
import { lineEndAt, lineStartAt } from '../Engine/markdownCode'
import { linkAt } from '../Input/edits'

export const restedOnLink = StateEffect.define<number>()

/** Finishing a link leaves the caret on the closer and it should read as finished there — but that is true of the GESTURE, not the position: clicking beside a link is aiming at its syntax and must still reveal it. */
export const linkRest = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(restedOnLink)) return e.value
    // Any further transaction is the user doing something else — a click, a keystroke, an edit.
    return tr.docChanged || tr.selection ? null : value
  },
})

export const linkSettled = StateEffect.define<null>()

export interface Writing {
  start: number
  was: string
}

/** The link an edit is being made inside, as it read before the first edit: what the typing color, alias memory, emptied-part collapse, and the picker's Remove Title baseline all compare against. Armed by a typed or deleted change reaching into a link, mapped through changes, cleared when the settle lands. */
export const linkWriting = StateField.define<Writing | null>({
  create: () => null,
  update(w, tr) {
    if (tr.effects.some((e) => e.is(linkSettled))) return null
    if (!tr.docChanged) return w
    const kept = w && { start: tr.changes.mapPos(w.start, 1), was: w.was }
    if (!tr.isUserEvent('input') && !tr.isUserEvent('delete')) return kept
    return changedLink(tr, kept) ?? kept
  },
})

// The link already armed keeps its baseline; only a change landing in another link reads the old document for how that link read.
function changedLink(tr: Transaction, kept: Writing | null): Writing | null {
  const scan = docScan.after(tr)
  let found: Writing | null = null
  tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    if (found) return
    const after = linkWithin(scan, fromB, toB)
    if (!after) return
    found =
      after.start === kept?.start
        ? kept
        : {
            start: after.start,
            was: linkWithin(docScan(tr.startState.doc), fromA, toA)?.text ?? '',
          }
  })
  return found
}

/** The link of either syntax a range reaches strictly into, so typing just past a closer never arms and a caret on a closer is outside. */
export function linkWithin(
  scan: DocScan,
  from: number,
  to = from,
): { start: number; text: string } | null {
  const ls = lineStartAt(scan.text, from)
  const reaches = (o: LinkOccurrence | null): LinkOccurrence | null =>
    o && ls + o.full[0] < to && ls + o.full[1] > from ? o : null
  const o =
    reaches(linkAt(scan, from)) ?? reaches(linkAt(scan, Math.min(to, lineEndAt(scan.text, from))))
  return o && { start: ls + o.full[0], text: scan.text.slice(ls + o.full[0], ls + o.full[1]) }
}
