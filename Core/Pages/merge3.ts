import { diff } from '@codemirror/merge'

interface Edit {
  from: number
  to: number
  insert: string
}

export const changesTo = (base: string, other: string): Edit[] =>
  diff(base, other).map((c) => ({
    from: c.fromA,
    to: c.toA,
    insert: other.slice(c.fromB, c.toB),
  }))

function render(base: string, from: number, to: number, edits: Edit[]): string {
  let out = ''
  let at = from
  for (const e of edits) {
    out += base.slice(at, e.from) + e.insert
    at = e.to
  }
  return out + base.slice(at, to)
}

export function merge3(
  base: string,
  local: string,
  remote: string,
): { text: string; conflicted: boolean } {
  const left = changesTo(base, local)
  const right = changesTo(base, remote)
  let text = ''
  let at = 0
  let conflicted = false
  let l = 0
  let r = 0
  while (l < left.length || r < right.length) {
    const runL: Edit[] = []
    const runR: Edit[] = []
    const from = Math.min(
      l < left.length ? left[l].from : Number.POSITIVE_INFINITY,
      r < right.length ? right[r].from : Number.POSITIVE_INFINITY,
    )
    let to = from
    for (;;) {
      if (l < left.length && left[l].from <= to) {
        to = Math.max(to, left[l].to)
        runL.push(left[l++])
        continue
      }
      if (r < right.length && right[r].from <= to) {
        to = Math.max(to, right[r].to)
        runR.push(right[r++])
        continue
      }
      break
    }
    text += base.slice(at, from)
    if (runL.length > 0 && runR.length > 0) {
      const ours = render(base, from, to, runL)
      const theirs = render(base, from, to, runR)
      text += theirs
      if (ours !== theirs) conflicted = true
    } else text += render(base, from, to, runL.length > 0 ? runL : runR)
    at = to
  }
  return { text: text + base.slice(at), conflicted }
}
