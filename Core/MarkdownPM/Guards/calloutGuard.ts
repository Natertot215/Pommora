// Repairs deletes that touch a callout body line's hidden `> ` prefix instead of cancelling them — a flat cancel made routine gestures silently dead, since their changes legitimately start at the line start.
import type { Extension } from '@codemirror/state'
import type { calloutLines } from '../Engine/detect'
import { docScan } from '../docCache'
import { type GuardVerdict, verdictFilter } from './verdictFilter'

export function calloutDeleteVerdict(
  doc: string,
  from: number,
  to: number,
  { lines, info }: { lines: string[]; info: ReturnType<typeof calloutLines> },
): GuardVerdict {
  if (to <= from) return { kind: 'ok' }
  let off = 0
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = off + lines[i].length
    const co = info[i]
    if (from >= off && from <= lineEnd) {
      // Body prefixes only — the head's whole-prefix delete is intentional, and the atomic range blocks partial head corruption.
      if (!co || co.first || co.prefixEnd === 0 || from >= off + co.prefixEnd) {
        // A join that leaves the body's `> ` intact splices a literal `>` into content, so extend it to consume the prefix.
        const ext = joinExtension(lines, info, from, to)
        return ext === null ? { kind: 'ok' } : { kind: 'extend', to: ext }
      }
      if (to >= lineEnd + 1 || to >= doc.length) return { kind: 'ok' }
      if (co.prefixEnd >= lines[i].length) return { kind: 'ok' }
      if (to >= off + co.prefixEnd) return { kind: 'clamp', from: off + co.prefixEnd }
      return { kind: 'cancel' }
    }
    off = lineEnd + 1
  }
  return { kind: 'ok' }
}

function joinExtension(
  lines: string[],
  info: ReturnType<typeof calloutLines>,
  from: number,
  to: number,
): number | null {
  let off = 0
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = off + lines[i].length
    const co = info[i]
    if (co && !co.first && co.prefixEnd > 0 && from < off && to >= off && to < off + co.prefixEnd) {
      return off + co.prefixEnd
    }
    if (off > to) break
    off = lineEnd + 1
  }
  return null
}

export const calloutGuard: Extension = verdictFilter((doc, fromA, toA, _inserted, state) => {
  const s = docScan(state.doc)
  return calloutDeleteVerdict(doc, fromA, toA, { lines: s.lines, info: s.callouts })
})
