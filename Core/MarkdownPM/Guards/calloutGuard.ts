// Repairs deletes that touch a callout body line's hidden `> ` prefix instead of cancelling them — a flat cancel made routine gestures silently dead, since their changes legitimately start at the line start.
import type { Extension } from '@codemirror/state'
import type { DocScan } from '../Engine/docScan'
import { lineEndOf, lineIndexAt } from '../Engine/markdownCode'
import { docScan } from '../docCache'
import { type GuardVerdict, verdictFilter } from './verdictFilter'

type CalloutScan = Pick<DocScan, 'lines' | 'lineStarts' | 'callouts'>

export function calloutDeleteVerdict(
  doc: string,
  from: number,
  to: number,
  s: CalloutScan,
): GuardVerdict {
  if (to <= from) return { kind: 'ok' }
  const i = lineIndexAt(s, from)
  const off = s.lineStarts[i]
  const co = s.callouts[i]
  // Body prefixes only — the head's whole-prefix delete is intentional, and the atomic range blocks partial head corruption.
  if (!co || co.first || co.prefixEnd === 0 || from >= off + co.prefixEnd) {
    // A join that leaves the body's `> ` intact splices a literal `>` into content, so extend it to consume the prefix.
    const ext = joinExtension(s, from, to)
    return ext === null ? { kind: 'ok' } : { kind: 'extend', to: ext }
  }
  if (to >= lineEndOf(s, i) + 1 || to >= doc.length) return { kind: 'ok' }
  if (co.prefixEnd >= s.lines[i].length) return { kind: 'ok' }
  if (to >= off + co.prefixEnd) return { kind: 'clamp', from: off + co.prefixEnd }
  return { kind: 'cancel' }
}

function joinExtension(s: CalloutScan, from: number, to: number): number | null {
  const i = lineIndexAt(s, to)
  const off = s.lineStarts[i]
  const co = s.callouts[i]
  return co && !co.first && co.prefixEnd > 0 && from < off && to < off + co.prefixEnd
    ? off + co.prefixEnd
    : null
}

export const calloutGuard: Extension = verdictFilter((doc, fromA, toA, _inserted, state) =>
  calloutDeleteVerdict(doc, fromA, toA, docScan(state.doc)),
)
